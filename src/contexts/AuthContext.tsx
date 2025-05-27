
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { signInWithEmailService, signUpWithEmailService, signOutService } from '@/services/authService';
import { fetchProfileById, updateProfileService } from '@/services/profileService';

// Define the shape of the profile data (can be moved to a types file later)
export interface UserProfile {
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
  authLoading: boolean; // Renamed from 'loading'
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
  const [authLoading, setAuthLoading] = useState(true); // Renamed

  const fetchProfileAndUpdateContext = async (userId: string) => {
    const { data: profileData, error: profileError } = await fetchProfileById(userId);
    if (profileError && !profileData) { // Allow profileData to be null if record doesn't exist (406)
        toast.error('Error fetching profile details.');
        setProfile(null);
    } else if (profileData) {
        setProfile(profileData);
    } else {
        // No profile data found, but no error (e.g. new user, profile not yet created by trigger)
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
    // onAuthStateChange will handle state updates.
    // Setting authLoading to false is tricky here as onAuthStateChange is async.
    // For simplicity, we let onAuthStateChange handle the final authLoading(false).
    // Or, we can optimistically set it false after a short delay if no immediate error.
    // However, the service already shows toasts.
    // The global authLoading primarily reflects the context's readiness.
    // Let's ensure onAuthStateChange consistently sets authLoading false.
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
    // onAuthStateChange will handle state updates.
  };

  const signOut = async () => {
    setAuthLoading(true); // To show loading state during sign out process
    await signOutService();
    // onAuthStateChange handles clearing session, user, profile and sets authLoading to false.
    // Explicitly clear here for immediate UI feedback before onAuthStateChange if desired, but can lead to race conditions.
    // Sticking to onAuthStateChange for consistency.
  };
  
  const updateContextUserProfile = async (updates: { full_name?: string; avatar_url?: string }) => {
    if (!user) {
      toast.error("You must be logged in to update your profile.");
      return false;
    }
    // Potentially use a different loading state like 'isUpdatingProfile'
    // For now, re-using authLoading might be okay if updates are quick
    // Or introduce a new state: const [profileUpdating, setProfileUpdating] = useState(false);
    setAuthLoading(true); // Or setProfileUpdating(true)
    const { data: updatedProfile, error } = await updateProfileService(user.id, updates);
    if (error || !updatedProfile) {
      toast.error(error?.message || 'Failed to update profile.');
      setAuthLoading(false); // Or setProfileUpdating(false)
      return false;
    }
    setProfile(updatedProfile);
    toast.success('Profile updated successfully!');
    setAuthLoading(false); // Or setProfileUpdating(false)
    return true;
  };

  const uploadAvatarAndUpdateProfile = async (file: File): Promise<boolean> => {
    if (!user) {
      toast.error("You must be logged in to upload an avatar.");
      return false;
    }
    setAuthLoading(true); // Or a specific 'isUploadingAvatar' state

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Math.random()}.${fileExt}`; // user.id as folder
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true }); // upsert: true to overwrite if exists

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
    
    // Update profile with new avatar_url
    const success = await updateContextUserProfile({ avatar_url: publicUrl });
    // updateContextUserProfile already sets authLoading to false
    return success;
  };
  
  const value = {
    session,
    user,
    profile,
    authLoading, // Renamed
    signInWithEmail,
    signUpWithEmail,
    signOut,
    updateContextUserProfile, // Renamed from updateUserProfile
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
