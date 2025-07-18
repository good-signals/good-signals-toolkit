
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Account, fetchUserAccountsWithAdminRole } from '@/services/account';
import AccountDetailsForm from '@/components/account/AccountDetailsForm';
import CompanyLogoUpload from '@/components/account/CompanyLogoUpload';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { Link } from 'react-router-dom'; // For a potential "Create Account" link
import { Skeleton } from "@/components/ui/skeleton"; // For loading state


const AccountManagementPage: React.FC = () => {
  const { user, authLoading } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && !authLoading) {
      setIsLoading(true);
      fetchUserAccountsWithAdminRole(user.id)
        .then(fetchedAccounts => {
          setAccounts(fetchedAccounts);
          if (fetchedAccounts.length > 0) {
            // For simplicity, select the first account. 
            // A multi-account selection UI could be added later.
            setSelectedAccount(fetchedAccounts[0]);
          }
        })
        .finally(() => setIsLoading(false));
    } else if (!authLoading) {
      setIsLoading(false); // Not logged in, stop loading
    }
  }, [user, authLoading]);

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
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-3xl">
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
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-3xl text-center">
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
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-3xl">
         <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary">Account Management</h1>
            <p className="text-muted-foreground">Manage your company settings.</p>
        </div>
        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>No Accounts Found</AlertTitle>
          <AlertDescription>
            You are not an administrator of any accounts, or no accounts have been set up for you yet.
            {/* TODO: Add a link to a "Create Account" page or contact support */}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (!selectedAccount && !isLoading) {
    // This case should ideally not be hit if accounts.length > 0, due to setSelectedAccount(fetchedAccounts[0])
    // but as a fallback:
    return (
         <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-3xl">
             <div className="mb-8">
                <h1 className="text-3xl font-bold text-primary">Account Management</h1>
             </div>
            <p>Loading account data or no account selected...</p>
        </div>
    );
  }


  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary">Account Management</h1>
        <p className="text-muted-foreground">Manage your company's details, logo, and team members.</p>
      </div>

      {selectedAccount && (
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
          {/* <CardFooter>
             <p className="text-xs text-muted-foreground">Further settings like team management will be here.</p>
          </CardFooter> */}
        </Card>
      )}
      
      {/* Placeholder for Team Management section if multiple accounts or more features are added */}
      {/* 
      {accounts.length > 1 && (
        <Card className="mt-8">
            <CardHeader><CardTitle>Select Account</CardTitle></CardHeader>
            <CardContent> ... UI to select among accounts ... </CardContent>
        </Card>
      )}
      */}
    </div>
  );
};

export default AccountManagementPage;
