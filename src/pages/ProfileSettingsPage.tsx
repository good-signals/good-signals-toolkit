
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProfileDetailsForm from '@/components/settings/ProfileDetailsForm';
import CompanyLogoDisplay from '@/components/settings/CompanyLogoDisplay';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import { fetchUserAccountsWithAdminRole, Account } from '@/services/accountService';

const ProfileSettingsPage: React.FC = () => {
  const { user, authLoading } = useAuth();
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
            <CompanyLogoDisplay 
              displayAccount={displayAccount}
              isLoadingAccount={isLoadingAccount}
            />
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
