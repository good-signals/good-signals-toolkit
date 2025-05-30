
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Account, fetchUserAccountsWithAdminRole } from '@/services/accountService';
import AccountDetailsForm from '@/components/account/AccountDetailsForm';
import CompanyLogoUpload from '@/components/account/CompanyLogoUpload';
import TeamManagement from '@/components/account/TeamManagement';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { Link } from 'react-router-dom';
import { Skeleton } from "@/components/ui/skeleton";

const AccountManagementPage: React.FC = () => {
  const { user, authLoading, activeAccount } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && !authLoading) {
      setIsLoading(true);
      fetchUserAccountsWithAdminRole(user.id)
        .then(fetchedAccounts => {
          setAccounts(fetchedAccounts);
          // Use active account if available, otherwise use first account
          const accountToSelect = activeAccount || fetchedAccounts[0] || null;
          setSelectedAccount(accountToSelect);
        })
        .finally(() => setIsLoading(false));
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [user, authLoading, activeAccount]);

  const handleAccountUpdate = (updatedAccount: Account) => {
    setSelectedAccount(updatedAccount);
    setAccounts(prevAccounts => 
      prevAccounts.map(acc => acc.id === updatedAccount.id ? updatedAccount : acc)
    );
  };

  const handleLogoUpdate = (newLogoUrl: string | null) => {
    if (selectedAccount) {
      setSelectedAccount(prev => prev ? { ...prev, logo_url: newLogoUrl } : null);
       setAccounts(prevAccounts => 
        prevAccounts.map(acc => acc.id === selectedAccount.id ? {...acc, logo_url: newLogoUrl} : acc)
      );
    }
  };

  if (authLoading || (isLoading && user)) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-4xl">
        <Skeleton className="h-8 w-1/2 mb-2" />
        <Skeleton className="h-4 w-3/4 mb-8" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3 mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Separator />
            <Skeleton className="h-20 w-full" />
             <Skeleton className="h-10 w-1/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-4xl text-center">
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You must be logged in to manage account settings. Please <Link to="/auth" className="font-bold hover:underline">sign in</Link>.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (accounts.length === 0 && !isLoading) {
     return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-4xl">
         <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary">Account Management</h1>
            <p className="text-muted-foreground">Manage your company settings.</p>
        </div>
        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>No Accounts Found</AlertTitle>
          <AlertDescription>
            You are not an administrator of any accounts, or no accounts have been set up for you yet.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (!selectedAccount && !isLoading) {
    return (
         <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-4xl">
             <div className="mb-8">
                <h1 className="text-3xl font-bold text-primary">Account Management</h1>
             </div>
            <p>Loading account data or no account selected...</p>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary">Account Management</h1>
        <p className="text-muted-foreground">Manage your company's details, logo, and team members.</p>
      </div>

      {selectedAccount && (
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>{selectedAccount.name || "Account Details"}</CardTitle>
              <CardDescription>Update your company's information and branding.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <AccountDetailsForm account={selectedAccount} onAccountUpdate={handleAccountUpdate} />
              <Separator />
              <CompanyLogoUpload account={selectedAccount} onLogoUpdate={handleLogoUpdate} />
            </CardContent>
          </Card>

          <TeamManagement account={selectedAccount} />
        </div>
      )}
    </div>
  );
};

export default AccountManagementPage;
