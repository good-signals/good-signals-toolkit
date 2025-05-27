import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button'; 
import { LogIn, Settings, UserCircle, LogOut, Briefcase, Compass, Upload } from 'lucide-react'; 
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/auth/UserAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// import { toast } from 'sonner'; // Toasts for signout handled by service

const Header = () => {
  const { user, profile, signOut, authLoading } = useAuth(); 
  const navigate = useNavigate();
  const isLoggedIn = !!user;

  const handleSignOut = async () => {
    await signOut();
    navigate('/'); 
  };

  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
        <Link to={isLoggedIn ? "/toolkit-hub" : "/"} className="flex items-center space-x-2">
          <Compass size={36} className="text-gold" />
          <h1 className="text-3xl font-bold text-gold">
            Good Signals
          </h1>
        </Link>
        <nav>
          {authLoading ? ( 
            <div className="text-sm animate-pulse">Loading...</div>
          ) : isLoggedIn && user ? ( 
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 p-1 rounded-full hover:bg-primary/80 focus-visible:ring-gold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-primary">
                  <UserAvatar avatarUrl={profile?.avatar_url} fullName={profile?.full_name || user.email} size={8} />
                  <span className="hidden md:inline text-sm font-medium">{profile?.full_name || user.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card border-border shadow-lg mt-1">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-card-foreground">{profile?.full_name || "User"}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile-settings')} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/account-management')} className="cursor-pointer">
                  <Briefcase className="mr-2 h-4 w-4" />
                  <span>Account Management</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive hover:!text-destructive hover:!bg-destructive/10 focus:text-destructive focus:bg-destructive/10">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth">
              <Button variant="outline" className="bg-gold text-gold-foreground hover:bg-gold/90 border-gold focus-visible:ring-gold">
                <LogIn className="mr-2 h-5 w-5" />
                Access Toolkit
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
