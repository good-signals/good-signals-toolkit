
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCircle } from 'lucide-react';

interface UserAvatarProps {
  avatarUrl?: string | null;
  fullName?: string | null;
  size?: number; // e.g., h-10 w-10 -> size=10
  className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ avatarUrl, fullName, size = 10, className }) => {
  const getInitials = (name?: string | null) => {
    if (!name) return '';
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    return initials;
  };

  const avatarSizeClass = `h-${size} w-${size}`;

  return (
    <Avatar className={`${avatarSizeClass} ${className}`}>
      <AvatarImage src={avatarUrl || undefined} alt={fullName || 'User Avatar'} />
      <AvatarFallback className={avatarSizeClass}>
        {fullName ? getInitials(fullName) : <UserCircle className={`h-${Math.floor(size * 0.8)} w-${Math.floor(size * 0.8)}`} />}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
