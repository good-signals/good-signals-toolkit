
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, LogOut, Settings, Shield, Map, Target, BarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import UserAvatar from '@/components/auth/UserAvatar';
import { Account } from '@/services/account';

interface HeaderUserMenuProps {
  user: any;
  userAccount: Account | null;
  isSuperAdmin: boolean;
  signOut: () => Promise<void>;
}

const HeaderUserMenu: React.FC<HeaderUserMenuProps> = ({
  user,
  userAccount,
  isSuperAdmin,
  signOut,
}) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Use company logo first, then fallback to user avatar
  const avatarUrl = userAccount?.logo_url || user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.full_name || user?.email;

  if (!user) {
    return (
      <Button asChild className="bg-white text-black hover:bg-gray-100">
        <Link to="/auth">Sign In</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      {userAccount?.name && (
        <span className="text-sm font-medium text-white hidden sm:block">
          {userAccount.name}
        </span>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-8 w-8 rounded-full hover:bg-gray-800"
          >
            <UserAvatar 
              avatarUrl={avatarUrl} 
              fullName={displayName}
              size={8}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <div className="flex items-center justify-start gap-2 p-2">
            <div className="flex flex-col space-y-1 leading-none">
              {user.email && (
                <p className="text-sm font-medium">{user.email}</p>
              )}
              {userAccount?.name && (
                <p className="text-xs text-muted-foreground">{userAccount.name}</p>
              )}
              {isSuperAdmin && (
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-orange-600" />
                  <span className="text-xs text-orange-600 font-medium">Super Admin</span>
                </div>
              )}
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/profile-settings" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Profile Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/account-management" className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Account Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/treasure-map-upload" className="cursor-pointer">
              <Map className="mr-2 h-4 w-4" />
              Map Configuration
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/target-metric-sets" className="cursor-pointer">
              <Target className="mr-2 h-4 w-4" />
              Target Metrics
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/signal-settings" className="cursor-pointer">
              <BarChart className="mr-2 h-4 w-4" />
              Signal Settings
            </Link>
          </DropdownMenuItem>
          {isSuperAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/super-admin" className="cursor-pointer text-orange-600">
                  <Shield className="mr-2 h-4 w-4" />
                  Super Admin Dashboard
                </Link>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default HeaderUserMenu;
