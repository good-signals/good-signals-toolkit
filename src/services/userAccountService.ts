
import { supabase } from '@/integrations/supabase/client';

export interface UserAccount {
  id: string;
  name: string;
  category?: string | null;
  subcategory?: string | null;
  address?: string | null;
  logo_url?: string | null;
  role: 'account_admin' | 'account_user' | 'super_admin';
}

export const getUserAccount = async (userId: string): Promise<UserAccount | null> => {
  try {
    const { data: membership, error: membershipError } = await supabase
      .from('account_memberships')
      .select(`
        role,
        accounts!inner (
          id,
          name,
          category,
          subcategory,
          address,
          logo_url
        )
      `)
      .eq('user_id', userId)
      .single();

    if (membershipError) {
      console.error('Error fetching user account membership:', membershipError);
      return null;
    }

    if (!membership || !membership.accounts) {
      return null;
    }

    const account = membership.accounts as any;
    
    return {
      id: account.id,
      name: account.name,
      category: account.category,
      subcategory: account.subcategory,
      address: account.address,
      logo_url: account.logo_url,
      role: membership.role,
    };
  } catch (error) {
    console.error('Error in getUserAccount:', error);
    return null;
  }
};
