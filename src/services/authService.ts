
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
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error.message);
    toast.error(error.message || 'Sign out failed.');
  } else {
    toast.success('Signed out successfully!');
  }
  // AuthContext's onAuthStateChange will handle clearing session/user/profile
  return { error };
};
