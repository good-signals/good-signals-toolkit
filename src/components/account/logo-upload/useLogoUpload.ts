
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Account, updateAccountDetailsService, uploadCompanyLogo, deleteCompanyLogo, extractPathFromUrl } from '@/services/account';
import { validateAndSanitizeImage } from '@/utils/imageValidation';

interface UseLogoUploadProps {
  account: Account;
  onLogoUpdate: (newLogoUrl: string | null) => void;
}

export const useLogoUpload = ({ account, onLogoUpdate }: UseLogoUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (account.logo_url) {
      setPreview(account.logo_url);
    } else {
      setPreview(null);
    }
    setValidationError(null);
  }, [account.logo_url]);

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setSelectedFile(null);
    setValidationError(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    setValidationError(null);
    setSelectedFile(null);
    
    if (!file) {
      setPreview(account.logo_url || null);
      return;
    }

    const validation = validateAndSanitizeImage(file);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid file');
      toast.error(validation.error || 'Invalid file selected');
      resetFileInput();
      setPreview(account.logo_url || null);
      return;
    }

    setSelectedFile(file);
    
    try {
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
    } catch (error) {
      console.error('Error creating preview:', error);
      toast.error('Failed to create image preview');
      resetFileInput();
      setPreview(account.logo_url || null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload.");
      return;
    }
    
    if (!account?.id) {
      toast.error("Account information is missing. Cannot upload logo.");
      return;
    }

    if (validationError) {
      toast.error("Please fix the validation error before uploading.");
      return;
    }

    setIsUploading(true);
    console.log('Starting logo upload process for account:', account.id);

    try {
      if (account.logo_url) {
        const oldLogoPath = extractPathFromUrl(account.logo_url);
        if (oldLogoPath) {
          console.log('Attempting to delete old logo:', oldLogoPath);
          await deleteCompanyLogo(oldLogoPath);
        }
      }

      console.log('Uploading new logo file:', selectedFile.name);
      const newLogoPublicUrl = await uploadCompanyLogo(account.id, selectedFile);

      if (!newLogoPublicUrl) {
        throw new Error('Failed to upload logo to storage');
      }

      console.log('Logo uploaded successfully, updating database with URL:', newLogoPublicUrl);

      const updatedAccount = await updateAccountDetailsService(account.id, { 
        logo_url: newLogoPublicUrl 
      });

      if (!updatedAccount) {
        console.error('Database update failed, cleaning up uploaded file');
        const uploadedPath = extractPathFromUrl(newLogoPublicUrl);
        if (uploadedPath) {
          await deleteCompanyLogo(uploadedPath);
        }
        throw new Error('Failed to update account with new logo URL');
      }

      console.log('Logo upload process completed successfully');
      onLogoUpdate(newLogoPublicUrl);
      toast.success("Company logo updated successfully!");
      
      resetFileInput();
      setPreview(newLogoPublicUrl);

    } catch (error: any) {
      console.error('Logo upload process failed:', error);
      toast.error(error.message || 'Failed to upload logo. Please try again.');
      
      setPreview(account.logo_url || null);
      resetFileInput();
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleRemoveLogo = async () => {
    if (!account.logo_url) {
      toast.info("No logo to remove.");
      return;
    }
    
    setIsUploading(true);
    console.log('Starting logo removal process');

    try {
      const updatedAccount = await updateAccountDetailsService(account.id, { 
        logo_url: null 
      });

      if (!updatedAccount) {
        throw new Error('Failed to remove logo reference from account');
      }

      const oldLogoPath = extractPathFromUrl(account.logo_url);
      if (oldLogoPath) {
        console.log('Deleting logo file from storage:', oldLogoPath);
        const deleted = await deleteCompanyLogo(oldLogoPath);
        if (!deleted) {
          console.warn('Failed to delete logo file from storage, but database was updated');
        }
      }

      console.log('Logo removal completed successfully');
      onLogoUpdate(null);
      toast.success("Company logo removed successfully.");
      
      resetFileInput();
      setPreview(null);

    } catch (error: any) {
      console.error('Logo removal failed:', error);
      toast.error(error.message || 'Failed to remove logo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    console.log('Canceling logo upload');
    resetFileInput();
    setPreview(account.logo_url || null);
  };

  return {
    selectedFile,
    preview,
    isUploading,
    validationError,
    fileInputRef,
    handleFileChange,
    handleUpload,
    handleRemoveLogo,
    handleCancel,
  };
};
