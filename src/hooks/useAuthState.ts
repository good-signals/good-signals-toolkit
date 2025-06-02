
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
  const [activeOperations, setActiveOperations] = useState<Set<string>>(new Set());
  const [authInitialized, setAuthInitialized] = useState(false);

  const addActiveOperation = (operationId: string) => {
    console.log('[AuthContext] Adding active operation:', operationId);
    setActiveOperations(prev => new Set(prev).add(operationId));
  };

  const removeActiveOperation = (operationId: string) => {
    console.log('[AuthContext] Removing active operation:', operationId);
    setActiveOperations(prev => {
      const next = new Set(prev);
      next.delete(operationId);
      return next;
    });
  };

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

  // Initialize auth state
  useEffect(() => {
    console.log('[AuthContext] Initializing auth state');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('[AuthContext] Auth state changed:', { 
        event, 
        hasSession: !!newSession, 
        hasUser: !!newSession?.user,
        userId: newSession?.user?.id,
        accessToken: newSession?.access_token ? 'present' : 'missing',
        activeOperationsCount: activeOperations.size
      });
      
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      if (!authInitialized) {
        console.log('[AuthContext] Auth initialized');
        setAuthInitialized(true);
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

    // THEN check for existing session
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
          setAuthInitialized(true);
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
        
        // Mark auth as initialized if not already
        if (!authInitialized) {
          setAuthInitialized(true);
        }
      } catch (error) {
        console.error('[AuthContext] Exception during auth initialization:', error);
        setAuthInitialized(true);
      }
    };

    // Add timeout protection - force resolve loading after 5 seconds
    const timeoutId = setTimeout(() => {
      if (!authInitialized) {
        console.warn('[AuthContext] Auth loading timeout - forcing initial resolution');
        setAuthInitialized(true);
      }
    }, 5000);

    initializeAuth();

    return () => {
      console.log('[AuthContext] Cleaning up auth subscription');
      clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, []); // No dependencies to avoid race conditions

  // Effect to handle loading state based on auth initialization and active operations
  useEffect(() => {
    const hasActiveOps = activeOperations.size > 0;
    
    console.log('[AuthContext] Loading state check:', { 
      hasActiveOps, 
      authInitialized,
      currentAuthLoading: authLoading,
      activeOperationsCount: activeOperations.size,
      operations: Array.from(activeOperations)
    });
    
    // Resolve loading if auth is initialized AND no active operations
    if (authInitialized && !hasActiveOps) {
      if (authLoading) {
        console.log('[AuthContext] Resolving auth loading - auth initialized and no active operations');
        setAuthLoading(false);
      }
    } else if (hasActiveOps) {
      if (!authLoading) {
        console.log('[AuthContext] Setting auth loading - active operations detected');
        setAuthLoading(true);
      }
    }
  }, [activeOperations.size, authInitialized, authLoading]);

  return {
    session,
    user,
    profile,
    authLoading,
    setProfile,
    setAuthLoading,
    addActiveOperation,
    removeActiveOperation,
  };
};
