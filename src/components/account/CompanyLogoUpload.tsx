
import React from 'react';
import { Label } from '@/components/ui/label';
import { Account } from '@/services/account';
import LogoPreview from './logo-upload/LogoPreview';
import LogoUploadControls from './logo-upload/LogoUploadControls';
import ValidationError from './logo-upload/ValidationError';
import { useLogoUpload } from './logo-upload/useLogoUpload';

interface CompanyLogoUploadProps {
  account: Account;
  onLogoUpdate: (newLogoUrl: string | null) => void;
}

const CompanyLogoUpload: React.FC<CompanyLogoUploadProps> = ({ account, onLogoUpdate }) => {
  const {
    selectedFile,
    preview,
    isUploading,
    validationError,
    fileInputRef,
    handleFileChange,
    handleUpload,
    handleRemoveLogo,
    handleCancel,
  } = useLogoUpload({ account, onLogoUpdate });

  return (
    <div className="space-y-4">
      <Label>Company Logo</Label>
      
      <div className="flex items-center space-x-4">
        <LogoPreview preview={preview} accountName={account.name} />
        
        <LogoUploadControls
          fileInputRef={fileInputRef}
          selectedFile={selectedFile}
          preview={preview}
          isUploading={isUploading}
          onFileChange={handleFileChange}
          onUpload={handleUpload}
          onCancel={handleCancel}
          onRemoveLogo={handleRemoveLogo}
        />
      </div>

      {validationError && <ValidationError error={validationError} />}
    </div>
  );
};

export default CompanyLogoUpload;
