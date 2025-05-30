
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { signInWithEmailService, signUpWithEmailService, signOutService } from '@/services/authService';
import { Account, fetchUserAccounts } from '@/services/accountService';
import { hasUserSetAnyMetrics } from '@/services/targetMetricsService';

export interface UserProfile {
  id: string;
  full_name?: string;
  email: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  activeAccount: Account | null;
  setActiveAccount: (account: Account | null) => void;
  isSuperAdmin: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, firstName: string, lastName: string, companyName: string, companyAddress?: string | null, companyCategory?: string | null, companySubcategory?: string | null) => Promise<void>;
  signOut: () => Promise<void>;
  authLoading: boolean;
  updateContextUserProfile: (updates: Partial<UserProfile>) => void;
  uploadAvatarAndUpdateProfile: (file: File) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Check if user is super admin
  const checkSuperAdmin = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_global_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'super_admin')
        .single();

      if (error) {
        console.log('User is not a super admin:', error.message);
        setIsSuperAdmin(false);
        return;
      }
      
      setIsSuperAdmin(!!data);
    } catch (error) {
      console.log('User is not a super admin');
      setIsSuperAdmin(false);
    }
  };

  // Load user profile
  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return;
      }

      if (data) {
        setProfile({
          id: data.id,
          full_name: data.full_name,
          email: user?.email || '',
          avatar_url: data.avatar_url
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  // Initialize user account after authentication
  const initializeUserAccount = async (userId: string) => {
    try {
      console.log('AuthContext: Initializing user account for:', userId);
      const accounts = await fetchUserAccounts(userId);
      
      if (accounts.length > 0) {
        console.log('AuthContext: Setting active account:', accounts[0].name);
        setActiveAccount(accounts[0]);
        
        // Check if user has metrics and redirect accordingly
        setTimeout(async () => {
          try {
            const hasSetMetrics = await hasUserSetAnyMetrics(userId);
            
            if (hasSetMetrics) {
              console.log('AuthContext: User has metrics, redirecting to toolkit hub');
              window.location.href = '/toolkit-hub';
            } else {
              console.log('AuthContext: New user, redirecting to target selection');
              window.location.href = '/target-selection';
            }
          } catch (error) {
            console.error("AuthContext: Error checking user metrics:", error);
            // On error, default to toolkit hub
            window.location.href = '/toolkit-hub';
          }
        }, 100);
      } else {
        console.log('AuthContext: No accounts found, redirecting to account selection');
        setTimeout(() => {
          window.location.href = '/account-selection';
        }, 100);
      }
    } catch (error) {
      console.error('AuthContext: Error initializing user account:', error);
      // On error, redirect to account selection
      setTimeout(() => {
        window.location.href = '/account-selection';
      }, 100);
    }
  };

  useEffect(() => {
    let mounted = true;
    let authStateProcessed = false;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (!mounted) return;

        // Prevent processing the same auth state multiple times
        if (authStateProcessed && event === 'INITIAL_SESSION') {
          console.log('Auth state already processed, skipping');
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Load profile and check super admin status
          try {
            await Promise.all([
              loadUserProfile(session.user.id),
              checkSuperAdmin(session.user.id)
            ]);
            
            // Only initialize account on SIGNED_IN event (not INITIAL_SESSION)
            if (event === 'SIGNED_IN') {
              await initializeUserAccount(session.user.id);
            }
          } catch (error) {
            console.error('Error loading user data:', error);
          }
        } else {
          // Clear all state when user signs out
          setProfile(null);
          setActiveAccount(null);
          setIsSuperAdmin(false);
        }
        
        // Set loading to false after processing auth state
        if (mounted) {
          console.log('Setting authLoading to false after auth state change');
          setAuthLoading(false);
          authStateProcessed = true;
        }
      }
    );

    // Check for existing session
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }

        if (!mounted) return;

        console.log('Initial session:', session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          try {
            await Promise.all([
              loadUserProfile(session.user.id),
              checkSuperAdmin(session.user.id)
            ]);
          } catch (error) {
            console.error('Error loading initial user data:', error);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          console.log('Setting authLoading to false after initialization');
          setAuthLoading(false);
        }
      }
    };

    initializeAuth();

    // Add a timeout failsafe to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (mounted && authLoading) {
        console.warn('Auth loading timeout reached, forcing authLoading to false');
        setAuthLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    console.log('AuthContext: signInWithEmail called');
    try {
      await signInWithEmailService(email, password);
      console.log('AuthContext: signInWithEmailService completed');
    } catch (error) {
      console.error('AuthContext: signInWithEmail error:', error);
      throw error; // Re-throw to let the form handle it
    }
  };

  const signUpWithEmail = async (email: string, password: string, firstName: string, lastName: string, companyName: string, companyAddress?: string | null, companyCategory?: string | null, companySubcategory?: string | null) => {
    await signUpWithEmailService(email, password, firstName, lastName);
  };

  const signOut = async () => {
    setActiveAccount(null);
    setProfile(null);
    setIsSuperAdmin(false);
    await signOutService();
  };

  const updateContextUserProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  const uploadAvatarAndUpdateProfile = async (file: File): Promise<boolean> => {
    if (!user) return false;

    // Upload avatar implementation would go here
    // For now, just a placeholder
    console.log('Upload avatar functionality to be implemented');
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        activeAccount,
        setActiveAccount,
        isSuperAdmin,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        authLoading,
        updateContextUserProfile,
        uploadAvatarAndUpdateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
