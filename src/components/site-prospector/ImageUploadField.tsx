
import React, { useState, useEffect, ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { XCircle, UploadCloud, Image as ImageIcon } from 'lucide-react';

interface ImageUploadFieldProps {
  id: string;
  currentImageUrl?: string | null;
  onFileChange: (file: File | null) => void;
  onRemoveCurrentImage?: () => void; // For explicitly removing an existing image URL
  disabled?: boolean;
}

const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  id,
  currentImageUrl,
  onFileChange,
  onRemoveCurrentImage,
  disabled,
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    if (currentImageUrl) {
      setPreview(currentImageUrl);
      setFileName(null); // Don't show file name if we have an existing URL
    } else {
      setPreview(null);
    }
  }, [currentImageUrl]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileChange(file);
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // If no file is selected (e.g., user cancels file dialog), 
      // and there's no currentImageUrl, clear preview
      if (!currentImageUrl) {
        setPreview(null);
        setFileName(null);
      }
      onFileChange(null);
    }
  };

  const handleRemoveImage = () => {
    setPreview(null);
    setFileName(null);
    onFileChange(null); // Notify parent that the staged file is removed
    if (currentImageUrl && onRemoveCurrentImage) {
      onRemoveCurrentImage(); // Notify parent to clear the existing image URL
    }
    // Reset the file input
    const fileInput = document.getElementById(id) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative group w-full h-40 border-2 border-dashed border-muted-foreground/50 rounded-lg flex items-center justify-center overflow-hidden">
        {preview ? (
          <>
            <img src={preview} alt="Preview" className="object-contain h-full w-full" />
            {!disabled && (
                <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleRemoveImage}
                title="Remove image"
                >
                <XCircle className="h-4 w-4" />
                </Button>
            )}
          </>
        ) : (
          <div className="text-center p-4">
            <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-1 text-sm text-muted-foreground">
              {fileName || 'No image selected'}
            </p>
          </div>
        )}
         {!disabled && !preview && (
            <label
            htmlFor={id}
            className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
            <UploadCloud className="h-8 w-8 text-white" />
            <Input
                id={id}
                type="file"
                accept="image/png, image/jpeg, image/gif, image/webp"
                onChange={handleFileChange}
                className="sr-only"
                disabled={disabled}
            />
            </label>
        )}
      </div>
      {!disabled && preview && (
         <Input
            id={`${id}-replace`} // Ensure unique ID for replace input
            type="file"
            accept="image/png, image/jpeg, image/gif, image/webp"
            onChange={handleFileChange}
            className="w-full text-sm"
            disabled={disabled}
          />
      )}
      {!disabled && !preview && (
         <Input
            id={id}
            type="file"
            accept="image/png, image/jpeg, image/gif, image/webp"
            onChange={handleFileChange}
            className="w-full text-sm"
            disabled={disabled}
          />
      )}
    </div>
  );
};

export default ImageUploadField;
