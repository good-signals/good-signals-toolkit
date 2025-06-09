
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
    console.log('Starting account update for ID:', accountId, 'Updates:', Object.keys(updates));
    
    // Validate accountId
    if (!accountId || typeof accountId !== 'string') {
      console.error('Invalid account ID provided:', accountId);
      toast.error('Invalid account ID. Please refresh the page and try again.');
      return null;
    }

    // Prepare update data with timestamp
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    console.log('Attempting to update account with data:', updateData);

    // Perform the update with proper error handling
    const { data, error } = await supabase
      .from('accounts')
      .update(updateData)
      .eq('id', accountId)
      .select()
      .single();

    if (error) {
      console.error('Database error during account update:', {
        error,
        accountId,
        updateData,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details
      });

      // Provide specific error messages based on error type
      if (error.code === 'PGRST116') {
        toast.error('Account not found or you do not have permission to update it.');
      } else if (error.code === '42501') {
        toast.error('Permission denied. Please check your account access.');
      } else {
        toast.error(`Failed to update account: ${error.message}`);
      }
      return null;
    }
    
    if (!data) {
      console.error('Account update returned no data. This should not happen.');
      toast.error('Update completed but failed to retrieve updated data. Please refresh the page.');
      return null;
    }

    console.log('Account update successful:', data);
    toast.success('Account details updated successfully!');
    return data;
    
  } catch (error: any) {
    console.error('Unexpected error during account update:', {
      error,
      accountId,
      updates,
      stack: error.stack
    });
    toast.error('An unexpected error occurred while updating account details.');
    return null;
  }
};

export const uploadCompanyLogo = async (accountId: string, file: File): Promise<string | null> => {
  try {
    console.log('Starting logo upload for account:', accountId, 'File:', file.name);

    // Generate unique filename
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const fileName = `logo_${timestamp}.${fileExt}`;
    const filePath = `${accountId}/${fileName}`;

    console.log('Uploading to path:', filePath);

    const { data, error: uploadError } = await supabase.storage
      .from('company-logos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', {
        error: uploadError,
        filePath,
        fileSize: file.size,
        fileType: file.type
      });
      toast.error(`Logo upload failed: ${uploadError.message}`);
      return null;
    }

    console.log('Upload successful, getting public URL for:', data.path);

    const { data: urlData } = supabase.storage
      .from('company-logos')
      .getPublicUrl(data.path);

    if (!urlData.publicUrl) {
      console.error('Failed to get public URL for uploaded file');
      toast.error('Upload succeeded but failed to get file URL.');
      return null;
    }
    
    console.log('Logo upload completed successfully:', urlData.publicUrl);
    return urlData.publicUrl;

  } catch (error: any) {
    console.error('Unexpected error during logo upload:', {
      error,
      accountId,
      fileName: file.name,
      stack: error.stack
    });
    toast.error('An unexpected error occurred during logo upload.');
    return null;
  }
};

export const deleteCompanyLogo = async (logoPath: string): Promise<boolean> => {
  try {
    console.log('Deleting logo at path:', logoPath);

    if (!logoPath || !logoPath.includes('/')) {
      console.error("Invalid logo path for deletion:", logoPath);
      toast.error("Could not delete old logo: Invalid path.");
      return false;
    }

    const { error } = await supabase.storage
      .from('company-logos')
      .remove([logoPath]);

    if (error) {
      console.error('Error deleting company logo:', error);
      return false;
    }

    console.log('Logo deletion successful');
    return true;
  } catch (error: any) {
    console.error('Unexpected error deleting company logo:', error);
    return false;
  }
};

// Helper function to extract storage path from public URL
export const extractPathFromUrl = (url: string): string | null => {
  try {
    const urlObject = new URL(url);
    // Path for Supabase storage public URLs: /storage/v1/object/public/bucket_name/file_path
    const pathParts = urlObject.pathname.split('/');
    if (pathParts.length > 5 && pathParts[4] === 'company-logos') {
      return pathParts.slice(5).join('/');
    }
    return null;
  } catch (error) {
    console.error("Error extracting path from URL:", error);
    return null;
  }
};
