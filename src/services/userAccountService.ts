
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
    const { data: memberships, error: membershipError } = await supabase
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
      .order('created_at', { ascending: false }); // Get most recent membership first

    if (membershipError) {
      console.error('Error fetching user account membership:', membershipError);
      return null;
    }

    if (!memberships || memberships.length === 0) {
      console.log('No account memberships found for user:', userId);
      return null;
    }

    // Take the first (most recent) membership if multiple exist
    const membership = memberships[0];
    
    if (!membership || !membership.accounts) {
      console.log('No account data found in membership for user:', userId);
      return null;
    }

    const account = membership.accounts as any;
    
    console.log('Found account for user:', userId, 'Account:', account.name);
    
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
