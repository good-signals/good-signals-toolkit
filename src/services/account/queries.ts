
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Account } from './types';

export const fetchUserAccountsWithAdminRole = async (userId: string): Promise<Account[]> => {
  try {
    const { data: memberships, error: membershipError } = await supabase
      .from('account_memberships')
      .select('account_id')
      .eq('user_id', userId)
      .eq('role', 'account_admin');

    if (membershipError) {
      console.error('Error fetching user account memberships:', membershipError);
      toast.error('Failed to fetch your accounts.');
      return [];
    }

    if (!memberships || memberships.length === 0) {
      return [];
    }

    const accountIds = memberships.map(m => m.account_id);

    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('*')
      .in('id', accountIds);

    if (accountsError) {
      console.error('Error fetching accounts:', accountsError);
      toast.error('Failed to load account details.');
      return [];
    }
    return accounts || [];
  } catch (error: any) {
    console.error('Catch Error fetching user accounts:', error);
    toast.error('An unexpected error occurred while fetching accounts.');
    return [];
  }
};

export const fetchAccountById = async (accountId: string): Promise<Account | null> => {
  try {
    const { data: account, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (error) {
      console.error('Error fetching account by ID:', error);
      return null;
    }

    return account;
  } catch (error: any) {
    console.error('Error in fetchAccountById:', error);
    return null;
  }
};
