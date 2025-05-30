
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Hook for secure Supabase operations with enhanced error handling
export const useSecureSupabase = () => {
  const { user } = useAuth();

  const executeSecureOperation = async <T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    errorMessage: string = 'Operation failed'
  ): Promise<{ data: T | null; error: any }> => {
    if (!user) {
      const authError = new Error('Authentication required');
      toast.error('You must be logged in to perform this action');
      return { data: null, error: authError };
    }

    try {
      const result = await operation();
      
      if (result.error) {
        console.error('Supabase operation error:', result.error);
        
        // Handle specific error types
        if (result.error.code === 'PGRST301') {
          toast.error('Access denied: You do not have permission to perform this action');
        } else if (result.error.code === '42501') {
          toast.error('Insufficient permissions');
        } else {
          toast.error(errorMessage);
        }
      }
      
      return result;
    } catch (error) {
      console.error('Unexpected error in secure operation:', error);
      toast.error('An unexpected error occurred');
      return { data: null, error };
    }
  };

  return {
    executeSecureOperation,
    isAuthenticated: !!user,
    currentUser: user
  };
};
