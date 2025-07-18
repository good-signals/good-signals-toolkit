
import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import UserAvatar from '@/components/auth/UserAvatar';
import { toast } from 'sonner';
import { UploadCloud } from 'lucide-react'; // Removed CheckCircle, AlertCircle as they are not used

interface AvatarUploadProps {
  displayImageUrl?: string | null;
  displayName?: string | null;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({ displayImageUrl, displayName }) => {
  const { user, profile, uploadAvatarAndUpdateProfile, authLoading } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("File is too large. Maximum size is 5MB.");
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        toast.error("Invalid file type. Only JPG, PNG, GIF are allowed.");
        return;
      }
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    } else {
      setSelectedFile(null);
      setPreview(null); // Clear preview if file selection is cancelled
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload.");
      return;
    }
    setIsUploading(true);
    // This function updates the USER's avatar_url in the profiles table
    const success = await uploadAvatarAndUpdateProfile(selectedFile);
    if (success) {
      // toast.success("Avatar updated successfully!"); // Handled by context
      setSelectedFile(null);
      setPreview(null);
      if(fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset file input
      }
    } else {
      // toast.error("Failed to update avatar."); // Handled by context
    }
    setIsUploading(false);
  };

  const currentAvatarUrl = preview || displayImageUrl || profile?.avatar_url;
  const currentDisplayName = displayName || profile?.full_name || user?.email;

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <UserAvatar 
          avatarUrl={currentAvatarUrl} 
          fullName={currentDisplayName} 
          size={20} // h-20 w-20
          className="border-2 border-muted"
        />
        <div>
          <Label htmlFor="avatar-upload" className="cursor-pointer text-sm font-medium text-primary hover:underline">
            {selectedFile ? "Change personal picture" : "Upload personal picture"}
          </Label>
          <Input 
            id="avatar-upload" 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/gif" 
          />
          <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF up to 5MB. This updates your personal avatar.</p>
        </div>
      </div>

      {selectedFile && (
        <div className="flex items-center space-x-2">
          <Button onClick={handleUpload} disabled={isUploading || authLoading} size="sm">
            {isUploading || authLoading ? <><UploadCloud className="mr-2 h-4 w-4 animate-pulse" /> Uploading...</> : <><UploadCloud className="mr-2 h-4 w-4" /> Upload & Save Personal Avatar</>}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setSelectedFile(null); 
              setPreview(null);
              if(fileInputRef.current) fileInputRef.current.value = "";
            }}
            disabled={isUploading || authLoading}
          >
            Cancel
          </Button>
        </div>
      )}
      {isUploading && <p className="text-sm text-muted-foreground">Processing image...</p>}
    </div>
  );
};

export default AvatarUpload;
