
import { useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { fetchProfileById } from '@/services/profileService';
import { UserProfile } from '@/types/auth';

export const useAuthState = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const fetchProfileAndUpdateContext = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await fetchProfileById(userId);
      if (profileError && !profileData) {
        console.warn('[AuthContext] Error fetching profile details:', profileError);
        toast.error('Error fetching profile details.');
        setProfile(null);
      } else if (profileData) {
        setProfile(profileData);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('[AuthContext] Exception fetching profile:', error);
      setProfile(null);
    }
  };

  useEffect(() => {
    console.log('[AuthContext] Initializing auth state');
    
    let authResolved = false;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('[AuthContext] Auth state changed:', { 
        event, 
        hasSession: !!newSession, 
        hasUser: !!newSession?.user,
        userId: newSession?.user?.id,
        accessToken: newSession?.access_token ? 'present' : 'missing'
      });
      
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      // Authentication state is now determined - resolve loading immediately
      if (!authResolved) {
        console.log('[AuthContext] Resolving auth loading state');
        setAuthLoading(false);
        authResolved = true;
      }
      
      if (newSession?.user) {
        // Ensure the session is properly set in Supabase client
        try {
          await supabase.auth.setSession({
            access_token: newSession.access_token,
            refresh_token: newSession.refresh_token,
          });
        } catch (error) {
          console.warn('[AuthContext] Error setting session:', error);
        }
        
        // Fetch profile in background - don't block auth resolution
        fetchProfileAndUpdateContext(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    // THEN check for existing session with timeout protection
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        console.log('[AuthContext] Initial session check:', { 
          hasSession: !!currentSession, 
          hasUser: !!currentSession?.user,
          error: error?.message,
          accessToken: currentSession?.access_token ? 'present' : 'missing'
        });
        
        if (error) {
          console.error('[AuthContext] Error getting initial session:', error);
          if (!authResolved) {
            console.log('[AuthContext] Resolving auth loading after error');
            setAuthLoading(false);
            authResolved = true;
          }
          return;
        }
        
        // If we have a session and no auth state change event fired yet
        if (currentSession && !session) {
          // Ensure the session is properly set in Supabase client
          try {
            await supabase.auth.setSession({
              access_token: currentSession.access_token,
              refresh_token: currentSession.refresh_token,
            });
          } catch (error) {
            console.warn('[AuthContext] Error setting initial session:', error);
          }
          
          setSession(currentSession);
          setUser(currentSession.user);
          
          if (currentSession.user) {
            fetchProfileAndUpdateContext(currentSession.user.id);
          }
        }
        
        // Always resolve auth loading after initial check
        if (!authResolved) {
          console.log('[AuthContext] Resolving auth loading after initial check');
          setAuthLoading(false);
          authResolved = true;
        }
      } catch (error) {
        console.error('[AuthContext] Exception during auth initialization:', error);
        if (!authResolved) {
          console.log('[AuthContext] Resolving auth loading after exception');
          setAuthLoading(false);
          authResolved = true;
        }
      }
    };

    // Add timeout protection - force resolve loading after 3 seconds
    const timeoutId = setTimeout(() => {
      if (!authResolved) {
        console.warn('[AuthContext] Auth loading timeout - forcing resolution');
        setAuthLoading(false);
        authResolved = true;
      }
    }, 3000);

    initializeAuth();

    return () => {
      console.log('[AuthContext] Cleaning up auth subscription');
      clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, []); // No dependencies to avoid race conditions

  return {
    session,
    user,
    profile,
    authLoading,
    setProfile,
    setAuthLoading,
  };
};
