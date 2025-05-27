
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Define Account type (can be moved to a central types file later)
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
  role: 'account_admin' | 'account_user'; // Using string literals from your enum
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

export const updateAccountDetailsService = async (accountId: string, updates: Partial<Pick<Account, 'name' | 'category' | 'subcategory' | 'address' | 'logo_url'>>): Promise<Account | null> => {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', accountId)
      .select()
      .single();

    if (error) {
      console.error('Error updating account details in service:', error);
      toast.error(`Failed to update account: ${error.message}`);
      return null;
    }
    toast.success('Account details updated successfully!');
    return data;
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
        upsert: true, // Overwrite if file with same name exists
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

// Optional: function to delete old logo if a new one is uploaded.
// This would typically be called before uploading a new logo if an old logo_url exists.
export const deleteCompanyLogo = async (logoPath: string): Promise<boolean> => {
    // logoPath should be the path within the bucket, e.g., account_id/filename.png
    // It can be derived from the logo_url by removing the storage base URL.
    // Example: if logo_url is "https://<project_ref>.supabase.co/storage/v1/object/public/company-logos/account_id/logo.png"
    // then logoPath is "account_id/logo.png"
    
    if (!logoPath.includes('/')) { // Basic check for a valid path
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
      // Don't toast error here, as it might be an optional step
      return false;
    }
    return true;
  } catch (e: any) {
    console.error('Catch error deleting old company logo:', e);
    return false;
  }
};
