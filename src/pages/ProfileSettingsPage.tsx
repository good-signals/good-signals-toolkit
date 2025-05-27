
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProfileDetailsForm from '@/components/settings/ProfileDetailsForm';
// AvatarUpload is removed as we are no longer uploading personal avatars here
import UserAvatar from '@/components/auth/UserAvatar'; // To display company logo
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Briefcase, Building } from 'lucide-react'; // Added Building icon
import { fetchUserAccountsWithAdminRole, Account } from '@/services/accountService';
import { Skeleton } from '@/components/ui/skeleton';

const ProfileSettingsPage: React.FC = () => {
  const { user, profile, authLoading } = useAuth(); // Added profile for user's name fallback
  const [displayAccount, setDisplayAccount] = useState<Account | null>(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      setIsLoadingAccount(true);
      fetchUserAccountsWithAdminRole(user.id)
        .then(accounts => {
          if (accounts && accounts.length > 0) {
            setDisplayAccount(accounts[0]);
          }
        })
        .catch(error => {
          console.error("Failed to fetch user accounts for profile display:", error);
        })
        .finally(() => {
          setIsLoadingAccount(false);
        });
    }
  }, [user, authLoading]);

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary">Profile & Settings</h1>
        <p className="text-muted-foreground">Manage your personal information and account settings.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your name and email address. Your company logo (if set) is displayed below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ProfileDetailsForm />
            <Separator />
            <div>
              <h3 className="text-lg font-medium mb-2">Company Logo</h3>
              {isLoadingAccount && !displayAccount ? (
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-20 w-20 rounded-full border-2 border-muted" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ) : displayAccount?.logo_url ? (
                <div className="flex items-center space-x-4">
                  <UserAvatar 
                    avatarUrl={displayAccount.logo_url} 
                    fullName={displayAccount.name} 
                    size={20} // h-20 w-20
                    className="border-2 border-muted"
                  />
                  <div>
                    <p className="text-sm font-medium">{displayAccount.name}</p>
                    <p className="text-xs text-muted-foreground">This is your primary company logo.</p>
                    <p className="text-xs text-muted-foreground mt-1">To change the logo, go to Account Management.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-3 p-4 border border-dashed rounded-md bg-muted/50">
                  <Building className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">No company logo has been set.</p>
                    <p className="text-xs text-muted-foreground">You can upload one in Account Management.</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Account Management</CardTitle>
            <CardDescription>Manage your company settings, logo, and team members.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Access settings related to your company account, including company details and logo.
            </p>
             <Link to="/account-management">
              <Button variant="outline">
                <Briefcase className="mr-2 h-4 w-4" />
                Go to Account Management
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSettingsPage;
