
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { UploadCloud, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Account, updateAccountDetailsService, uploadCompanyLogo, deleteCompanyLogo, extractPathFromUrl } from '@/services/accountService';
import { validateAndSanitizeImage } from '@/utils/imageValidation';

interface CompanyLogoUploadProps {
  account: Account;
  onLogoUpdate: (newLogoUrl: string | null) => void;
}

const CompanyLogoUpload: React.FC<CompanyLogoUploadProps> = ({ account, onLogoUpdate }) => {
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
    // Clear any validation errors when account changes
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
    
    // Clear previous state
    setValidationError(null);
    setSelectedFile(null);
    
    if (!file) {
      setPreview(account.logo_url || null);
      return;
    }

    // Validate the file
    const validation = validateAndSanitizeImage(file);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid file');
      toast.error(validation.error || 'Invalid file selected');
      resetFileInput();
      setPreview(account.logo_url || null);
      return;
    }

    // File is valid, set it and create preview
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
      // Step 1: Delete old logo if it exists (optional - don't block if this fails)
      if (account.logo_url) {
        const oldLogoPath = extractPathFromUrl(account.logo_url);
        if (oldLogoPath) {
          console.log('Attempting to delete old logo:', oldLogoPath);
          await deleteCompanyLogo(oldLogoPath);
        }
      }

      // Step 2: Upload new logo
      console.log('Uploading new logo file:', selectedFile.name);
      const newLogoPublicUrl = await uploadCompanyLogo(account.id, selectedFile);

      if (!newLogoPublicUrl) {
        throw new Error('Failed to upload logo to storage');
      }

      console.log('Logo uploaded successfully, updating database with URL:', newLogoPublicUrl);

      // Step 3: Update account with new logo URL
      const updatedAccount = await updateAccountDetailsService(account.id, { 
        logo_url: newLogoPublicUrl 
      });

      if (!updatedAccount) {
        // If database update fails, we should clean up the uploaded file
        console.error('Database update failed, cleaning up uploaded file');
        const uploadedPath = extractPathFromUrl(newLogoPublicUrl);
        if (uploadedPath) {
          await deleteCompanyLogo(uploadedPath);
        }
        throw new Error('Failed to update account with new logo URL');
      }

      // Step 4: Success - update UI state
      console.log('Logo upload process completed successfully');
      onLogoUpdate(newLogoPublicUrl);
      toast.success("Company logo updated successfully!");
      
      // Reset form state
      resetFileInput();
      setPreview(newLogoPublicUrl);

    } catch (error: any) {
      console.error('Logo upload process failed:', error);
      toast.error(error.message || 'Failed to upload logo. Please try again.');
      
      // Revert preview to original logo
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
      // Step 1: Update database to remove logo URL
      const updatedAccount = await updateAccountDetailsService(account.id, { 
        logo_url: null 
      });

      if (!updatedAccount) {
        throw new Error('Failed to remove logo reference from account');
      }

      // Step 2: Delete file from storage (optional - don't block if this fails)
      const oldLogoPath = extractPathFromUrl(account.logo_url);
      if (oldLogoPath) {
        console.log('Deleting logo file from storage:', oldLogoPath);
        const deleted = await deleteCompanyLogo(oldLogoPath);
        if (!deleted) {
          console.warn('Failed to delete logo file from storage, but database was updated');
        }
      }

      // Step 3: Success - update UI state
      console.log('Logo removal completed successfully');
      onLogoUpdate(null);
      toast.success("Company logo removed successfully.");
      
      // Reset form state
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

  return (
    <div className="space-y-4">
      <Label>Company Logo</Label>
      
      <div className="flex items-center space-x-4">
        <Avatar className="h-20 w-20 rounded-md border bg-muted">
          <AvatarImage 
            src={preview || undefined} 
            alt={account.name || 'Company Logo'} 
            className="object-contain" 
          />
          <AvatarFallback className="rounded-md">
            <ImageIcon className="h-10 w-10 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        
        <div className="flex flex-col space-y-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isUploading}
          >
            {selectedFile || preview ? "Change Logo" : "Upload Logo"}
          </Button>
          
          <Input 
            id="logo-upload" 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/gif, image/svg+xml" 
            disabled={isUploading}
          />
          
          {preview && !selectedFile && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRemoveLogo} 
              disabled={isUploading} 
              className="text-destructive hover:text-destructive"
            >
              Remove Logo
            </Button>
          )}
          
          <p className="text-xs text-muted-foreground">
            PNG, JPG, GIF, SVG up to 5MB.
          </p>
        </div>
      </div>

      {validationError && (
        <div className="flex items-center space-x-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{validationError}</span>
        </div>
      )}

      {selectedFile && (
        <div className="flex items-center space-x-2">
          <Button 
            onClick={handleUpload} 
            disabled={isUploading || !!validationError} 
            size="sm"
          >
            {isUploading ? (
              <>
                <UploadCloud className="mr-2 h-4 w-4 animate-pulse" /> 
                Uploading...
              </>
            ) : (
              <>
                <UploadCloud className="mr-2 h-4 w-4" /> 
                Upload & Save
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCancel}
            disabled={isUploading}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

export default CompanyLogoUpload;
