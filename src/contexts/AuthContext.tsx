import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { signInWithEmailService, signUpWithEmailService, signOutService, resetPasswordService, updatePasswordService } from '@/services/authService';
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
    setAuthLoading(true);
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        await fetchProfileAndUpdateContext(currentSession.user.id);
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setAuthLoading(true);
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        setTimeout(async () => {
            await fetchProfileAndUpdateContext(newSession.user.id);
            setAuthLoading(false);
        }, 0);
      } else {
        setProfile(null);
        setAuthLoading(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    setAuthLoading(true);
    await signInWithEmailService(email, password);
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
    setAuthLoading(true);
    await signUpWithEmailService(
      email, password, firstName, lastName, companyName, 
      companyAddress, companyCategory, companySubcategory
    );
  };

  const resetPassword = async (email: string) => {
    await resetPasswordService(email);
  };

  const updatePassword = async (newPassword: string) => {
    return await updatePasswordService(newPassword);
  };

  const signOut = async () => {
    setAuthLoading(true);
    await signOutService();
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
    signUpWithEmail,
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
