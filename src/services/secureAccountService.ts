
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Account } from './accountService';
import { validateImageFile } from '@/utils/fileValidation';
import { sanitizeInput } from '@/utils/inputValidation';
import { logDataAccess, logFileUpload, logPermissionDenied } from '@/utils/securityAudit';

// Enhanced account service with security features
export const updateAccountDetailsSecure = async (
  userId: string,
  accountId: string, 
  updates: Partial<Pick<Account, 'name' | 'category' | 'subcategory' | 'address' | 'signal_good_threshold' | 'signal_bad_threshold'>>
): Promise<Account | null> => {
  try {
    logDataAccess(userId, `account:${accountId}`, 'update');

    // Sanitize string inputs
    const sanitizedUpdates = {
      ...updates,
      name: updates.name ? sanitizeInput(updates.name) : undefined,
      category: updates.category ? sanitizeInput(updates.category) : undefined,
      subcategory: updates.subcategory ? sanitizeInput(updates.subcategory) : undefined,
      address: updates.address ? sanitizeInput(updates.address) : undefined,
    };

    // Validate numeric inputs
    if (sanitizedUpdates.signal_good_threshold !== undefined) {
      sanitizedUpdates.signal_good_threshold = Number(sanitizedUpdates.signal_good_threshold);
      if (isNaN(sanitizedUpdates.signal_good_threshold) || sanitizedUpdates.signal_good_threshold < 0 || sanitizedUpdates.signal_good_threshold > 1) {
        toast.error('Signal good threshold must be between 0 and 1');
        return null;
      }
    }
    
    if (sanitizedUpdates.signal_bad_threshold !== undefined) {
      sanitizedUpdates.signal_bad_threshold = Number(sanitizedUpdates.signal_bad_threshold);
      if (isNaN(sanitizedUpdates.signal_bad_threshold) || sanitizedUpdates.signal_bad_threshold < 0 || sanitizedUpdates.signal_bad_threshold > 1) {
        toast.error('Signal bad threshold must be between 0 and 1');
        return null;
      }
    }

    const { data, error } = await supabase
      .from('accounts')
      .update({ ...sanitizedUpdates, updated_at: new Date().toISOString() })
      .eq('id', accountId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error updating account details:', error);
      if (error.code === '42501' || error.code === 'PGRST301') {
        logPermissionDenied(userId, `update account:${accountId}`);
        toast.error('You do not have permission to update this account');
      } else {
        toast.error(`Failed to update account: ${error.message}`);
      }
      return null;
    }
    
    if (data) {
      toast.success('Account details updated successfully!');
    }
    return data;
  } catch (error: any) {
    console.error('Unexpected error updating account:', error);
    toast.error('An unexpected error occurred while updating account details.');
    return null;
  }
};

export const uploadCompanyLogoSecure = async (userId: string, accountId: string, file: File): Promise<string | null> => {
  try {
    logDataAccess(userId, `account:${accountId}`, 'upload_logo');

    // Validate file before upload
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid file');
      return null;
    }

    logFileUpload(userId, file.name, file.size);

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
      if (uploadError.message.includes('permission')) {
        logPermissionDenied(userId, `upload logo to account:${accountId}`);
        toast.error('You do not have permission to upload logos for this account');
      } else {
        toast.error(`Logo upload failed: ${uploadError.message}`);
      }
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
    console.error('Unexpected error during logo upload:', error);
    toast.error('An unexpected error occurred during logo upload.');
    return null;
  }
};
