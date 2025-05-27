import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

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
  signUpWithEmail: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    companyName: string,
    companyAddress: string | null,
    companyCategory: string | null,
    companySubcategory: string | null
  ) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (updates: { full_name?: string; avatar_url?: string }) => Promise<boolean>;
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
      setLoading(true); // Start loading
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        await fetchProfile(currentSession.user.id);
      }
      setLoading(false); // End loading
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setLoading(true); // Start loading on auth state change
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // Defer fetchProfile call if it involves async operations that might call Supabase again
        setTimeout(async () => {
            await fetchProfile(newSession.user.id);
            setLoading(false); // End loading after profile fetch
        }, 0);
      } else {
        setProfile(null); // Clear profile on logout
        setLoading(false); // End loading if no user
      }
      // Removed specific event handling for SIMPLICITY, general handling above covers most cases.
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

      if (error && status !== 406) { 
        console.error('Error fetching profile:', error);
        toast.error('Error fetching profile.');
        setProfile(null);
        return;
      }
      if (data) {
        setProfile(data as UserProfile);
      } else {
        setProfile(null); 
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

  const signUpWithEmail = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    companyName: string,
    companyAddress: string | null,
    companyCategory: string | null,
    companySubcategory: string | null
  ) => {
    setLoading(true);
    const fullName = `${firstName} ${lastName}`.trim();
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (signUpError) {
      console.error('Error signing up:', signUpError.message);
      toast.error(signUpError.message || 'Sign up failed. Please try again.');
      setLoading(false);
      return;
    }
    
    if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
      toast.info('User already exists but is unconfirmed. Please check your email to confirm your account or try signing in.');
      setLoading(false);
      return;
    }

    if (!signUpData.user) {
      // This case might happen if user already exists and is confirmed, Supabase returns an error which should be caught by signUpError block.
      // Or if email confirmation is required, and user is not "active" yet.
      toast.error('Sign up process did not return a user. If you are already registered, please try signing in. Otherwise, check your email for confirmation.');
      setLoading(false);
      return;
    }
    
    // User created in auth.users, now call Edge Function to create account and membership
    try {
      const { error: functionError } = await supabase.functions.invoke('create-account-and-admin', {
        body: { 
          userId: signUpData.user.id, 
          companyName,
          companyAddress,
          companyCategory,
          companySubcategory
        },
      });

      if (functionError) {
        throw functionError;
      }
      
      // If email confirmation is not required, user session might be active.
      // If email confirmation is required, user needs to confirm email then sign in.
      // The onAuthStateChange listener will handle setting the session and user.
      if (signUpData.session) { // User is immediately active (e.g. auto-confirm is on)
        toast.success('Sign up successful! Company account created.');
        // onAuthStateChange will fetch profile and set session.
      } else { // Email confirmation likely required
        toast.success('Sign up successful! Company account created. Please check your email to confirm your account.');
      }

    } catch (error) {
      console.error('Error creating company account/admin role:', error);
      toast.error(`Sign up succeeded, but failed to set up company: ${error.message}. Please contact support.`);
      // Potentially add logic here to "rollback" user creation or guide user, though complex.
    }

    setLoading(false);
  };

  const updateUserProfile = async (updates: { full_name?: string; avatar_url?: string }) => {
    if (!user) {
      toast.error("You must be logged in to update your profile.");
      return false;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        toast.error(error.message || 'Failed to update profile.');
        setLoading(false);
        return false;
      }

      if (data) {
        setProfile(data as UserProfile);
        toast.success('Profile updated successfully!');
        setLoading(false);
        return true;
      }
      setLoading(false);
      return false;
    } catch (error) {
      console.error('Catch error updating profile:', error);
      toast.error('An unexpected error occurred while updating your profile.');
      setLoading(false);
      return false;
    }
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setSession(null); // Clear session immediately
    setUser(null); // Clear user immediately
    setProfile(null); // Clear profile immediately
    if (error) {
      console.error('Error signing out:', error.message);
      toast.error(error.message || 'Sign out failed.');
    } else {
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
    updateUserProfile, // Add new function to context value
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
