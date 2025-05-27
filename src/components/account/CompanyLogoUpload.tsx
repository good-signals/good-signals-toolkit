
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Re-using Avatar for consistent look
import { toast } from 'sonner';
import { UploadCloud, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Account, updateAccountDetailsService, uploadCompanyLogo, deleteCompanyLogo } from '@/services/accountService';

interface CompanyLogoUploadProps {
  account: Account;
  onLogoUpdate: (newLogoUrl: string | null) => void;
}

const CompanyLogoUpload: React.FC<CompanyLogoUploadProps> = ({ account, onLogoUpdate }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (account.logo_url) {
      setPreview(account.logo_url);
    } else {
      setPreview(null);
    }
  }, [account.logo_url]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("File is too large. Maximum size is 5MB.");
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'].includes(file.type)) {
        toast.error("Invalid file type. Only JPG, PNG, GIF, SVG are allowed.");
        return;
      }
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    } else {
      setSelectedFile(null);
      // Revert preview to original logo_url if selection is cancelled
      setPreview(account.logo_url || null);
    }
  };

  const extractPathFromUrl = (url: string): string | null => {
    try {
      const urlObject = new URL(url);
      // Path for Supabase storage public URLs is typically /storage/v1/object/public/bucket_name/file_path
      const pathParts = urlObject.pathname.split('/');
      if (pathParts.length > 5 && pathParts[4] === 'company-logos') {
        return pathParts.slice(5).join('/');
      }
      return null;
    } catch (e) {
      console.error("Error extracting path from URL:", e);
      return null;
    }
  };
  
  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload.");
      return;
    }
    if (!account || !account.id) {
      toast.error("Account information is missing. Cannot upload logo.");
      return;
    }

    setIsUploading(true);

    // Optional: Delete old logo if it exists
    if (account.logo_url) {
        const oldLogoPath = extractPathFromUrl(account.logo_url);
        if (oldLogoPath) {
            await deleteCompanyLogo(oldLogoPath);
        }
    }

    const newLogoPublicUrl = await uploadCompanyLogo(account.id, selectedFile);

    if (newLogoPublicUrl) {
      const updatedAccount = await updateAccountDetailsService(account.id, { logo_url: newLogoPublicUrl });
      if (updatedAccount) {
        onLogoUpdate(newLogoPublicUrl);
        toast.success("Company logo updated successfully!");
        setSelectedFile(null);
        // Preview is already updated via onLogoUpdate -> useEffect
        if(fileInputRef.current) {
          fileInputRef.current.value = ""; // Reset file input
        }
      } else {
        // Error toast handled by updateAccountDetailsService
      }
    } else {
      // Error toast handled by uploadCompanyLogo
      // If upload failed, revert preview
      setPreview(account.logo_url || null);
    }
    setIsUploading(false);
  };
  
  const handleRemoveLogo = async () => {
    if (!account.logo_url) {
        toast.info("No logo to remove.");
        return;
    }
    setIsUploading(true); // Use same state to disable buttons

    const oldLogoPath = extractPathFromUrl(account.logo_url);
    if (oldLogoPath) {
        const deleted = await deleteCompanyLogo(oldLogoPath);
        if (deleted) {
            const updatedAccount = await updateAccountDetailsService(account.id, { logo_url: null });
            if (updatedAccount) {
                onLogoUpdate(null);
                toast.success("Company logo removed.");
                setPreview(null);
                setSelectedFile(null);
                 if(fileInputRef.current) fileInputRef.current.value = "";
            }
        } else {
            toast.error("Failed to delete logo from storage.");
        }
    } else {
        // If path extraction failed, still try to clear from DB
        const updatedAccount = await updateAccountDetailsService(account.id, { logo_url: null });
         if (updatedAccount) {
            onLogoUpdate(null);
            toast.success("Company logo reference removed. Please check storage if the file persists.");
            setPreview(null);
            setSelectedFile(null);
             if(fileInputRef.current) fileInputRef.current.value = "";
        }
    }
    setIsUploading(false);
  };


  return (
    <div className="space-y-4">
      <Label>Company Logo</Label>
      <div className="flex items-center space-x-4">
        <Avatar className="h-20 w-20 rounded-md border bg-muted">
          <AvatarImage src={preview || undefined} alt={account.name || 'Company Logo'} className="object-contain" />
          <AvatarFallback className="rounded-md">
            <ImageIcon className="h-10 w-10 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col space-y-2">
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
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
             <Button variant="outline" size="sm" onClick={handleRemoveLogo} disabled={isUploading} className="text-destructive hover:text-destructive">
                Remove Logo
             </Button>
           )}
          <p className="text-xs text-muted-foreground">PNG, JPG, GIF, SVG up to 5MB.</p>
        </div>
      </div>

      {selectedFile && (
        <div className="flex items-center space-x-2">
          <Button onClick={handleUpload} disabled={isUploading} size="sm">
            {isUploading ? <><UploadCloud className="mr-2 h-4 w-4 animate-pulse" /> Uploading...</> : <><UploadCloud className="mr-2 h-4 w-4" /> Upload & Save</>}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setSelectedFile(null); 
              setPreview(account.logo_url || null); // Revert to original on cancel
              if(fileInputRef.current) fileInputRef.current.value = "";
            }}
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
