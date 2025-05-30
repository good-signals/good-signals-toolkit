
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { signInWithEmailService, signUpWithEmailService, signOutService } from '@/services/authService';
import { Account } from '@/services/accountService';

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

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Load profile and check super admin status
          await Promise.all([
            loadUserProfile(session.user.id),
            checkSuperAdmin(session.user.id)
          ]);
        } else {
          // Clear all state when user signs out
          setProfile(null);
          setActiveAccount(null);
          setIsSuperAdmin(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await Promise.all([
          loadUserProfile(session.user.id),
          checkSuperAdmin(session.user.id)
        ]);
      }
      
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailService(email, password);
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
