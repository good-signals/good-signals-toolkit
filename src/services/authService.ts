
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

export const signUpWithEmailService = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  companyName: string,
  companyAddress: string | null,
  companyCategory: string | null,
  companySubcategory: string | null
) => {
  const fullName = `${firstName} ${lastName}`.trim();
  const redirectUrl = `${window.location.origin}/auth`;
  
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        full_name: fullName,
        // avatar_url is handled by profile creation trigger or separate upload
      },
    },
  });

  if (signUpError) {
    console.error('Error signing up:', signUpError.message);
    toast.error(signUpError.message || 'Sign up failed. Please try again.');
    return { user: null, session: null, error: signUpError };
  }

  if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
    toast.info('User already exists but is unconfirmed. Please check your email to confirm your account or try signing in.');
    return { user: signUpData.user, session: signUpData.session, error: new Error('User already exists but unconfirmed.') };
  }
  
  if (!signUpData.user) {
    toast.error('Sign up process did not return a user. If you are already registered, please try signing in.');
    return { user: null, session: null, error: new Error('Sign up did not return a user.') };
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
    
    if (signUpData.session) {
      toast.success('Sign up successful! Company account created.');
    } else {
      toast.success('Sign up successful! Company account created. Please check your email to confirm your account.');
    }
    return { user: signUpData.user, session: signUpData.session, error: null };

  } catch (error: any) {
    console.error('Error creating company account/admin role:', error);
    toast.error(`Sign up succeeded, but failed to set up company: ${error.message}. Please contact support.`);
    // Return user data because signup itself was successful, but company setup failed.
    return { user: signUpData.user, session: signUpData.session, error };
  }
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
