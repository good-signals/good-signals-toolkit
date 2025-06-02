import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { signInWithEmailService, signOutService, resetPasswordService, updatePasswordService } from '@/services/authService';
import { fetchProfileById, updateProfileService } from '@/services/profileService';

// Define the shape of the profile data
export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
}

// Define the shape of the context
interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  authLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateContextUserProfile: (updates: { full_name?: string; avatar_url?: string }) => Promise<boolean>;
  uploadAvatarAndUpdateProfile: (file: File) => Promise<boolean>;
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

  const signInWithEmail = async (email: string, password: string) => {
    console.log('[AuthContext] Sign in attempt for email:', email);
    setAuthLoading(true);
    try {
      // Get fresh session after sign in
      const { data: { session: freshSession }, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        console.error('[AuthContext] Sign in error:', error);
        toast.error(error.message || 'Sign in failed. Please check your credentials.');
        return;
      }
      
      if (freshSession) {
        console.log('[AuthContext] Fresh session obtained after sign in');
        // Ensure the session is properly set in Supabase client
        await supabase.auth.setSession({
          access_token: freshSession.access_token,
          refresh_token: freshSession.refresh_token,
        });
        
        // Force a session refresh to ensure tokens are valid
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.warn('[AuthContext] Session refresh failed after sign in:', refreshError);
        } else if (refreshedSession) {
          console.log('[AuthContext] Session refreshed successfully after sign in');
        }
        
        toast.success('Signed in successfully!');
      }
    } catch (error) {
      console.error('[AuthContext] Sign in exception:', error);
      toast.error('Sign in failed. Please try again.');
    } finally {
      // Don't set authLoading to false here - let the auth state change handler do it
    }
  };

  const resetPassword = async (email: string) => {
    await resetPasswordService(email);
  };

  const updatePassword = async (newPassword: string) => {
    return await updatePasswordService(newPassword);
  };

  const signOut = async () => {
    console.log('[AuthContext] Sign out attempt');
    setAuthLoading(true);
    try {
      await signOutService();
    } finally {
      // Don't set authLoading to false here - let the auth state change handler do it
    }
  };
  
  const updateContextUserProfile = async (updates: { full_name?: string; avatar_url?: string }) => {
    if (!user) {
      toast.error("You must be logged in to update your profile.");
      return false;
    }
    setAuthLoading(true);
    const { data: updatedProfile, error } = await updateProfileService(user.id, updates);
    if (error || !updatedProfile) {
      toast.error(error?.message || 'Failed to update profile.');
      setAuthLoading(false);
      return false;
    }
    setProfile(updatedProfile);
    toast.success('Profile updated successfully!');
    setAuthLoading(false);
    return true;
  };

  const uploadAvatarAndUpdateProfile = async (file: File): Promise<boolean> => {
    if (!user) {
      toast.error("You must be logged in to upload an avatar.");
      return false;
    }
    setAuthLoading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError);
      toast.error(uploadError.message || 'Failed to upload avatar.');
      setAuthLoading(false);
      return false;
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

    if (!publicUrl) {
        toast.error('Failed to get public URL for avatar.');
        setAuthLoading(false);
        return false;
    }
    
    const success = await updateContextUserProfile({ avatar_url: publicUrl });
    return success;
  };
  
  const value = {
    session,
    user,
    profile,
    authLoading,
    signInWithEmail,
    resetPassword,
    updatePassword,
    signOut,
    updateContextUserProfile,
    uploadAvatarAndUpdateProfile,
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
