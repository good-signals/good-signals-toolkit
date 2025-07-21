
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const signInWithEmailService = async (email: string, password: string) => {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('Error signing in:', error.message);
    toast.error(error.message || 'Sign in failed. Please check your credentials.');
  } else {
    toast.success('Signed in successfully!');
    // AuthContext's onAuthStateChange will handle session/user update
  }
  return { error };
};

export const resetPasswordService = async (email: string) => {
  const redirectUrl = `${window.location.origin}/auth/update-password`;
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });
  
  if (error) {
    console.error('Error sending reset password email:', error.message);
    toast.error(error.message || 'Failed to send reset password email.');
  } else {
    toast.success('Password reset email sent! Please check your inbox.');
  }
  
  return { error };
};

export const updatePasswordService = async (newPassword: string) => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });
  
  if (error) {
    console.error('Error updating password:', error.message);
    toast.error(error.message || 'Failed to update password.');
  } else {
    toast.success('Password updated successfully!');
  }
  
  return { error };
};

export const signOutService = async () => {
  try {
    // Always attempt to sign out with Supabase to clear all auth state
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      // Handle specific "session not found" error gracefully
      if (error.message?.toLowerCase().includes('session') && 
          (error.message?.toLowerCase().includes('not found') || 
           error.message?.toLowerCase().includes('missing'))) {
        console.log('Session already invalid, treating as successful sign out');
        toast.success('Signed out successfully!');
        return { error: null };
      }
      
      console.error('Error signing out:', error.message);
      toast.error(error.message || 'Sign out failed.');
      return { error };
    }
    
    toast.success('Signed out successfully!');
    return { error: null };
  } catch (error) {
    console.error('Exception during sign out:', error);
    // Even if there's an exception, we can treat it as successful since the goal is to sign out
    toast.success('Signed out successfully!');
    return { error: null };
  }
  // AuthContext's onAuthStateChange will handle clearing session/user/profile
};
