import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const signInWithEmailService = async (email: string, password: string) => {
  console.log('authService: Starting sign-in with email:', email);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    console.log('authService: Supabase response:', { data, error });

    if (error) {
      console.error('Sign in error:', error);
      
      if (error.message === 'Invalid login credentials') {
        toast.error('Invalid email or password. Please check your credentials.');
      } else if (error.message === 'Email not confirmed') {
        toast.error('Please check your email and click the confirmation link before signing in.');
      } else {
        toast.error(`Sign in failed: ${error.message}`);
      }
      throw error;
    }

    if (data.user) {
      console.log('authService: Sign-in successful, user:', data.user.id);
      toast.success('Successfully signed in!');
    }

    return data;
  } catch (error: any) {
    console.error('Unexpected sign in error:', error);
    toast.error('An unexpected error occurred during sign in.');
    throw error;
  }
};

export const signUpWithEmailService = async (
  email: string, 
  password: string, 
  firstName: string, 
  lastName: string
) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      },
    });

    if (error) {
      console.error('Sign up error:', error);
      
      if (error.message === 'User already registered') {
        toast.error('An account with this email already exists. Please sign in instead.');
      } else if (error.message.includes('Password')) {
        toast.error('Password must be at least 6 characters long.');
      } else {
        toast.error(`Sign up failed: ${error.message}`);
      }
      return;
    }

    if (data.user) {
      if (data.user.email_confirmed_at) {
        toast.success('Account created successfully! You can now sign in.');
      } else {
        toast.success('Account created! Please check your email for a confirmation link.');
      }
    }
  } catch (error: any) {
    console.error('Unexpected sign up error:', error);
    toast.error('An unexpected error occurred during sign up.');
  }
};

export const signOutService = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out. Please try again.');
      return;
    }

    toast.success('Successfully signed out!');
  } catch (error: any) {
    console.error('Unexpected sign out error:', error);
    toast.error('An unexpected error occurred during sign out.');
  }
};
