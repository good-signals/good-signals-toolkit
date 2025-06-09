
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Image as ImageIcon } from 'lucide-react';

interface LogoPreviewProps {
  preview: string | null;
  accountName: string;
}

const LogoPreview: React.FC<LogoPreviewProps> = ({ preview, accountName }) => {
  return (
    <Avatar className="h-20 w-20 rounded-md border bg-muted">
      <AvatarImage 
        src={preview || undefined} 
        alt={accountName || 'Company Logo'} 
        className="object-contain" 
      />
      <AvatarFallback className="rounded-md">
        <ImageIcon className="h-10 w-10 text-muted-foreground" />
      </AvatarFallback>
    </Avatar>
  );
};

export default LogoPreview;
