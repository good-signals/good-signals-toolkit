
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UploadCloud } from 'lucide-react';

interface LogoUploadControlsProps {
  fileInputRef: React.RefObject<HTMLInputElement>;
  selectedFile: File | null;
  preview: string | null;
  isUploading: boolean;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  onCancel: () => void;
  onRemoveLogo: () => void;
}

const LogoUploadControls: React.FC<LogoUploadControlsProps> = ({
  fileInputRef,
  selectedFile,
  preview,
  isUploading,
  onFileChange,
  onUpload,
  onCancel,
  onRemoveLogo,
}) => {
  return (
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
        onChange={onFileChange}
        accept="image/png, image/jpeg, image/gif, image/svg+xml" 
        disabled={isUploading}
      />
      
      {preview && !selectedFile && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRemoveLogo} 
          disabled={isUploading} 
          className="text-destructive hover:text-destructive"
        >
          Remove Logo
        </Button>
      )}
      
      <p className="text-xs text-muted-foreground">
        PNG, JPG, GIF, SVG up to 5MB.
      </p>

      {selectedFile && (
        <div className="flex items-center space-x-2">
          <Button 
            onClick={onUpload} 
            disabled={isUploading} 
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
            onClick={onCancel}
            disabled={isUploading}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

export default LogoUploadControls;
