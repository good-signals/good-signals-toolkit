
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
    const { data: profileData, error: profileError } = await fetchProfileById(userId);
    if (profileError && !profileData) {
        toast.error('Error fetching profile details.');
        setProfile(null);
    } else if (profileData) {
        setProfile(profileData);
    } else {
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
      
      setAuthLoading(true);
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      if (newSession?.user) {
        // Ensure the session is properly set in Supabase client
        await supabase.auth.setSession({
          access_token: newSession.access_token,
          refresh_token: newSession.refresh_token,
        });
        
        // Use setTimeout to defer profile fetching and avoid blocking auth state updates
        setTimeout(async () => {
          try {
            await fetchProfileAndUpdateContext(newSession.user.id);
          } catch (error) {
            console.error('[AuthContext] Error fetching profile during auth state change:', error);
          } finally {
            setAuthLoading(false);
          }
        }, 0);
      } else {
        setProfile(null);
        setAuthLoading(false);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session: currentSession }, error }) => {
      console.log('[AuthContext] Initial session check:', { 
        hasSession: !!currentSession, 
        hasUser: !!currentSession?.user,
        error: error?.message,
        accessToken: currentSession?.access_token ? 'present' : 'missing'
      });
      
      if (error) {
        console.error('[AuthContext] Error getting initial session:', error);
      }
      
      // Only set state if we don't already have a session (to avoid duplicate state updates)
      if (!session && currentSession) {
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
      
      if (!currentSession) {
        setAuthLoading(false);
      }
    });

    return () => {
      console.log('[AuthContext] Cleaning up auth subscription');
      subscription?.unsubscribe();
    };
  }, []);

  return {
    session,
    user,
    profile,
    authLoading,
    setProfile,
    setAuthLoading,
  };
};
