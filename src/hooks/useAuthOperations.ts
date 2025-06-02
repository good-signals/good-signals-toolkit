
import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { resetPasswordService, updatePasswordService, signOutService } from '@/services/authService';
import { updateProfileService } from '@/services/profileService';
import { UserProfile } from '@/types/auth';

export const useAuthOperations = (
  user: User | null,
  setProfile: (profile: UserProfile | null) => void,
  addActiveOperation: (operationId: string) => void,
  removeActiveOperation: (operationId: string) => void
) => {
  const signInWithEmail = async (email: string, password: string) => {
    const operationId = 'signin-' + Date.now();
    console.log('[AuthContext] Sign in attempt for email:', email, 'operationId:', operationId);
    
    addActiveOperation(operationId);
    
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
      console.log('[AuthContext] Removing sign in operation:', operationId);
      removeActiveOperation(operationId);
    }
  };

  const resetPassword = async (email: string) => {
    const operationId = 'reset-password-' + Date.now();
    addActiveOperation(operationId);
    
    try {
      await resetPasswordService(email);
    } finally {
      removeActiveOperation(operationId);
    }
  };

  const updatePassword = async (newPassword: string) => {
    const operationId = 'update-password-' + Date.now();
    addActiveOperation(operationId);
    
    try {
      return await updatePasswordService(newPassword);
    } finally {
      removeActiveOperation(operationId);
    }
  };

  const signOut = async () => {
    const operationId = 'signout-' + Date.now();
    console.log('[AuthContext] Sign out attempt, operationId:', operationId);
    
    addActiveOperation(operationId);
    
    try {
      await signOutService();
    } finally {
      console.log('[AuthContext] Removing sign out operation:', operationId);
      removeActiveOperation(operationId);
    }
  };
  
  const updateContextUserProfile = async (updates: { full_name?: string; avatar_url?: string }) => {
    if (!user) {
      toast.error("You must be logged in to update your profile.");
      return false;
    }
    
    const operationId = 'update-profile-' + Date.now();
    addActiveOperation(operationId);
    
    try {
      const { data: updatedProfile, error } = await updateProfileService(user.id, updates);
      if (error || !updatedProfile) {
        toast.error(error?.message || 'Failed to update profile.');
        return false;
      }
      setProfile(updatedProfile);
      toast.success('Profile updated successfully!');
      return true;
    } finally {
      removeActiveOperation(operationId);
    }
  };

  const uploadAvatarAndUpdateProfile = async (file: File): Promise<boolean> => {
    if (!user) {
      toast.error("You must be logged in to upload an avatar.");
      return false;
    }
    
    const operationId = 'upload-avatar-' + Date.now();
    addActiveOperation(operationId);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError);
        toast.error(uploadError.message || 'Failed to upload avatar.');
        return false;
      }

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      if (!publicUrl) {
          toast.error('Failed to get public URL for avatar.');
          return false;
      }
      
      const success = await updateContextUserProfile({ avatar_url: publicUrl });
      return success;
    } finally {
      removeActiveOperation(operationId);
    }
  };

  return {
    signInWithEmail,
    resetPassword,
    updatePassword,
    signOut,
    updateContextUserProfile,
    uploadAvatarAndUpdateProfile,
  };
};
