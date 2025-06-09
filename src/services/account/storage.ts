
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
