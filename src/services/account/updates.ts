
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Account } from './types';

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
