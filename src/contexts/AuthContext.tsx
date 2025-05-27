
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner"; // Using sonner for toasts

// Define the shape of the profile data
interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
  // Add other profile fields here if needed
}

// Define the shape of the context
interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// Create the context with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Props for the AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        await fetchProfile(currentSession.user.id);
      }
      setLoading(false);
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await fetchProfile(newSession.user.id);
      } else {
        setProfile(null); // Clear profile on logout
      }
      if (_event === 'INITIAL_SESSION') {
        // Already handled by getInitialSession
      } else {
        setLoading(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error, status } = await supabase
        .from('profiles')
        .select(`id, full_name, avatar_url, updated_at`)
        .eq('id', userId)
        .single();

      if (error && status !== 406) { // 406 means no rows found, which is fine if profile not yet created
        console.error('Error fetching profile:', error);
        toast.error('Error fetching profile.');
        setProfile(null);
        return;
      }
      if (data) {
        setProfile(data as UserProfile);
      }
    } catch (error) {
      console.error('Catch Error fetching profile:', error);
      toast.error('An unexpected error occurred while fetching your profile.');
      setProfile(null);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Error signing in:', error.message);
      toast.error(error.message || 'Sign in failed. Please check your credentials.');
    } else {
      toast.success('Signed in successfully!');
      // Profile will be fetched by onAuthStateChange
    }
    setLoading(false);
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    setLoading(true);
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          // avatar_url can be added here if collected at sign up
        },
      },
    });

    if (error) {
      console.error('Error signing up:', error.message);
      toast.error(error.message || 'Sign up failed. Please try again.');
    } else if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
      // This case handles when email confirmation is required and the user already exists but is not confirmed.
      // Supabase might return a user object here but with no identities, indicating an existing unconfirmed user.
      // Or if the user already exists and is confirmed, Supabase returns an error "User already registered".
      toast.info('If you have already signed up, please check your email to confirm your account or try signing in.');
    } else if (signUpData.user) {
      toast.success('Sign up successful! Please check your email to confirm your account.');
      // The handle_new_user trigger will create the profile.
      // onAuthStateChange will fetch it if session becomes active (e.g. after email confirmation or if auto-confirm is on)
    }
    setLoading(false);
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
      toast.error(error.message || 'Sign out failed.');
    } else {
      setProfile(null); // Explicitly clear profile on sign out
      toast.success('Signed out successfully!');
    }
    setLoading(false);
  };
  
  const value = {
    session,
    user,
    profile,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

