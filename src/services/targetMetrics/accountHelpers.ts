import { supabase } from '@/integrations/supabase/client';
import { Account } from '@/services/accountService';

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

// Super admin aware function to get account ID
export async function getSuperAdminAwareAccountId(userId: string, activeAccount?: Account | null): Promise<string | null> {
  // If there's an active account (super admin impersonating), use that
  if (activeAccount) {
    return activeAccount.id;
  }
  
  // Otherwise, get user's own account
  return getUserAccountId(userId);
}
