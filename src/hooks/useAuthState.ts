
import { useState, useEffect, useReducer } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { fetchProfileById } from '@/services/profileService';
import { UserProfile } from '@/types/auth';

// Define auth state and actions for reducer
interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  authLoading: boolean;
  authInitialized: boolean;
}

type AuthAction = 
  | { type: 'SET_SESSION'; session: Session | null; user: User | null }
  | { type: 'SET_PROFILE'; profile: UserProfile | null }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_INITIALIZED'; initialized: boolean };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_SESSION':
      return {
        ...state,
        session: action.session,
        user: action.user,
      };
    case 'SET_PROFILE':
      return {
        ...state,
        profile: action.profile,
      };
    case 'SET_LOADING':
      return {
        ...state,
        authLoading: action.loading,
      };
    case 'SET_INITIALIZED':
      return {
        ...state,
        authInitialized: action.initialized,
        authLoading: action.initialized ? false : state.authLoading,
      };
    default:
      return state;
  }
};

const initialAuthState: AuthState = {
  session: null,
  user: null,
  profile: null,
  authLoading: true,
  authInitialized: false,
};

export const useAuthState = () => {
  const [authState, dispatch] = useReducer(authReducer, initialAuthState);
  const [activeOperations, setActiveOperations] = useState<Set<string>>(new Set());

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
        dispatch({ type: 'SET_PROFILE', profile: null });
      } else if (profileData) {
        dispatch({ type: 'SET_PROFILE', profile: profileData });
      } else {
        dispatch({ type: 'SET_PROFILE', profile: null });
      }
    } catch (error) {
      console.error('[AuthContext] Exception fetching profile:', error);
      dispatch({ type: 'SET_PROFILE', profile: null });
    }
  };

  // Initialize auth state
  useEffect(() => {
    console.log('[AuthContext] Initializing auth state');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('[AuthContext] Auth state changed:', { 
        event, 
        hasSession: !!newSession, 
        hasUser: !!newSession?.user,
        userId: newSession?.user?.id,
        accessToken: newSession?.access_token ? 'present' : 'missing'
      });
      
      dispatch({ 
        type: 'SET_SESSION', 
        session: newSession, 
        user: newSession?.user ?? null 
      });
      
      // Check if auth is already initialized before setting it again
      if (!authState.authInitialized) {
        console.log('[AuthContext] Auth initialized');
        dispatch({ type: 'SET_INITIALIZED', initialized: true });
      }
      
      if (newSession?.user) {
        // Fetch profile in background
        fetchProfileAndUpdateContext(newSession.user.id);
      } else {
        dispatch({ type: 'SET_PROFILE', profile: null });
      }
    });

    // Check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        console.log('[AuthContext] Initial session check:', { 
          hasSession: !!currentSession, 
          hasUser: !!currentSession?.user,
          error: error?.message
        });
        
        if (error) {
          console.error('[AuthContext] Error getting initial session:', error);
          dispatch({ type: 'SET_INITIALIZED', initialized: true });
          return;
        }
        
        if (currentSession && !authState.session) {
          dispatch({ 
            type: 'SET_SESSION', 
            session: currentSession, 
            user: currentSession.user 
          });
          
          if (currentSession.user) {
            fetchProfileAndUpdateContext(currentSession.user.id);
          }
        }
        
        if (!authState.authInitialized) {
          dispatch({ type: 'SET_INITIALIZED', initialized: true });
        }
      } catch (error) {
        console.error('[AuthContext] Exception during auth initialization:', error);
        dispatch({ type: 'SET_INITIALIZED', initialized: true });
      }
    };

    // Timeout protection
    const timeoutId = setTimeout(() => {
      if (!authState.authInitialized) {
        console.warn('[AuthContext] Auth loading timeout - forcing resolution');
        dispatch({ type: 'SET_INITIALIZED', initialized: true });
      }
    }, 5000);

    initializeAuth();

    return () => {
      console.log('[AuthContext] Cleaning up auth subscription');
      clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, []); // Empty dependency array to prevent recreation

  // Handle loading state based on operations
  useEffect(() => {
    const hasActiveOps = activeOperations.size > 0;
    
    console.log('[AuthContext] Loading state check:', { 
      hasActiveOps, 
      authInitialized: authState.authInitialized,
      currentAuthLoading: authState.authLoading,
      activeOperationsCount: activeOperations.size
    });
    
    // Only update loading state if auth is initialized
    if (authState.authInitialized) {
      if (hasActiveOps && !authState.authLoading) {
        console.log('[AuthContext] Setting loading - operations detected');
        dispatch({ type: 'SET_LOADING', loading: true });
      } else if (!hasActiveOps && authState.authLoading) {
        console.log('[AuthContext] Clearing loading - no operations');
        dispatch({ type: 'SET_LOADING', loading: false });
      }
    }
  }, [activeOperations.size, authState.authInitialized, authState.authLoading]);

  const setProfile = (profile: UserProfile | null) => {
    dispatch({ type: 'SET_PROFILE', profile });
  };

  const setAuthLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', loading });
  };

  return {
    session: authState.session,
    user: authState.user,
    profile: authState.profile,
    authLoading: authState.authLoading,
    setProfile,
    setAuthLoading,
    addActiveOperation,
    removeActiveOperation,
  };
};
