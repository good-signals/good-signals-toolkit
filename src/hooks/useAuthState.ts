
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
    setAuthLoading(true);

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
      
      if (newSession?.user) {
        // Ensure the session is properly set in Supabase client
        await supabase.auth.setSession({
          access_token: newSession.access_token,
          refresh_token: newSession.refresh_token,
        });
        
        // Fetch profile in background but don't block auth loading resolution
        fetchProfileAndUpdateContext(newSession.user.id).finally(() => {
          setAuthLoading(false);
        });
      } else {
        setProfile(null);
        setAuthLoading(false);
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
          setAuthLoading(false);
          return;
        }
        
        // If we have a session but no auth state change event fired yet
        if (currentSession && !session) {
          // Ensure the session is properly set in Supabase client
          await supabase.auth.setSession({
            access_token: currentSession.access_token,
            refresh_token: currentSession.refresh_token,
          });
          
          setSession(currentSession);
          setUser(currentSession.user);
          
          if (currentSession.user) {
            await fetchProfileAndUpdateContext(currentSession.user.id);
          }
        }
        
        // Always resolve loading state after initial check
        setAuthLoading(false);
      } catch (error) {
        console.error('[AuthContext] Exception during auth initialization:', error);
        setAuthLoading(false);
      }
    };

    // Add timeout protection - force resolve loading after 10 seconds
    const timeoutId = setTimeout(() => {
      console.warn('[AuthContext] Auth loading timeout - forcing resolution');
      setAuthLoading(false);
    }, 10000);

    initializeAuth().finally(() => {
      clearTimeout(timeoutId);
    });

    return () => {
      console.log('[AuthContext] Cleaning up auth subscription');
      clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, []); // Remove session dependency to avoid race conditions

  return {
    session,
    user,
    profile,
    authLoading,
    setProfile,
    setAuthLoading,
  };
};
