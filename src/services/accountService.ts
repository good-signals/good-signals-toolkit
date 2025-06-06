
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Define Account type (simplified - removed signal thresholds)
export interface Account {
  id: string;
  name: string;
  category?: string | null;
  subcategory?: string | null;
  address?: string | null;
  logo_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AccountMembership {
  id: string;
  account_id: string;
  user_id: string;
  role: 'account_admin' | 'account_user';
  created_at?: string;
}

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

export const updateAccountDetailsService = async (
  accountId: string, 
  updates: Partial<Pick<Account, 'name' | 'category' | 'subcategory' | 'address' | 'logo_url'>>
): Promise<Account | null> => {
  try {
    console.log('Updating account with ID:', accountId, 'Updates:', updates);
    
    // First, check if the account exists
    const { data: existingAccount, error: checkError } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', accountId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking account existence:', checkError);
      toast.error(`Failed to verify account: ${checkError.message}`);
      return null;
    }

    if (!existingAccount) {
      console.error('Account not found with ID:', accountId);
      toast.error('Account not found. Please refresh the page and try again.');
      return null;
    }

    const { data, error } = await supabase
      .from('accounts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', accountId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error updating account details in service:', error);
      toast.error(`Failed to update account: ${error.message}`);
      return null;
    }
    
    if (data) {
        toast.success('Account details updated successfully!');
        return data;
    } else {
        console.error('Account update returned no data. Account ID:', accountId);
        toast.error('Failed to update account details. Please try again.');
        return null;
    }
  } catch (error: any) {
    console.error('Catch error updating account details in service:', error);
    toast.error('An unexpected error occurred while updating account details.');
    return null;
  }
};

export const uploadCompanyLogo = async (accountId: string, file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${accountId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('company-logos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading company logo:', uploadError);
      toast.error(`Logo upload failed: ${uploadError.message}`);
      return null;
    }

    const { data } = supabase.storage
      .from('company-logos')
      .getPublicUrl(filePath);

    if (!data.publicUrl) {
        toast.error('Failed to get public URL for logo.');
        return null;
    }
    
    return data.publicUrl;

  } catch (error: any) {
    console.error('Catch error during logo upload:', error);
    toast.error('An unexpected error occurred during logo upload.');
    return null;
  }
};

export const deleteCompanyLogo = async (logoPath: string): Promise<boolean> => {
    if (!logoPath.includes('/')) {
        console.error("Invalid logo path for deletion:", logoPath);
        toast.error("Could not delete old logo: Invalid path.");
        return false;
    }
  try {
    const { error } = await supabase.storage
      .from('company-logos')
      .remove([logoPath]);

    if (error) {
      console.error('Error deleting old company logo:', error);
      return false;
    }
    return true;
  } catch (e: any) {
    console.error('Catch error deleting old company logo:', e);
    return false;
  }
};
