
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import ProfileDetailsForm from '@/components/settings/ProfileDetailsForm';
import AvatarUpload from '@/components/settings/AvatarUpload'; 
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'; // Removed CardFooter
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import { fetchUserAccountsWithAdminRole, Account } from '@/services/accountService'; // Import service and type
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

const ProfileSettingsPage: React.FC = () => {
  const { user, authLoading } = useAuth(); // Get user and authLoading
  const [displayAccount, setDisplayAccount] = useState<Account | null>(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      setIsLoadingAccount(true);
      fetchUserAccountsWithAdminRole(user.id)
        .then(accounts => {
          if (accounts && accounts.length > 0) {
            setDisplayAccount(accounts[0]); // Display logo of the first account user is admin of
          }
        })
        .catch(error => {
          console.error("Failed to fetch user accounts for profile display:", error);
          // Optionally, set an error state or toast
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
            <CardDescription>Update your name, email address, and (optionally) your personal profile picture. The image below may show your company logo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ProfileDetailsForm />
            <Separator />
            <div>
              <h3 className="text-lg font-medium mb-2">Profile Picture</h3>
              {isLoadingAccount && !displayAccount ? (
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-20 w-20 rounded-full border-2 border-muted" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ) : (
                <AvatarUpload 
                  displayImageUrl={displayAccount?.logo_url} 
                  displayName={displayAccount?.name} 
                />
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
