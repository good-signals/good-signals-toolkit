
import { supabase } from '@/integrations/supabase/client';

// Helper function to get user's account ID (assumes user is admin of first account)
export async function getUserAccountId(userId: string): Promise<string | null> {
  console.log('Getting account ID for user:', userId);
  
  const { data, error } = await supabase
    .from('account_memberships')
    .select('account_id')
    .eq('user_id', userId)
    .eq('role', 'account_admin')
    .single();

  if (error) {
    console.error('Error fetching user account:', error);
    return null;
  }
  
  console.log('Found account ID:', data?.account_id);
  return data?.account_id || null;
}
