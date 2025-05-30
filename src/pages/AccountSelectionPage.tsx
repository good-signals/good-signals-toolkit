
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Account, fetchUserAccountsWithAdminRole } from '@/services/accountService';

const AccountSelectionPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, setActiveAccount } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user]);

  const loadAccounts = async () => {
    if (!user) return;
    
    setIsLoading(true);
    const userAccounts = await fetchUserAccountsWithAdminRole(user.id);
    setAccounts(userAccounts);
    setIsLoading(false);

    // If user only has one account, auto-select it
    if (userAccounts.length === 1) {
      handleAccountSelect(userAccounts[0]);
    }
  };

  const handleAccountSelect = (account: Account) => {
    setActiveAccount(account);
    navigate('/toolkit-hub');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-white">Loading your accounts...</p>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">No Accounts Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              You don't have access to any accounts yet. Please contact your administrator for access.
            </p>
            <Button variant="outline" onClick={() => navigate('/auth')}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Select Account</h1>
          <p className="text-gray-300">Choose which account you'd like to access</p>
        </div>

        <div className="space-y-4">
          {accounts.map((account) => (
            <Card 
              key={account.id} 
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
              onClick={() => handleAccountSelect(account)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      {account.logo_url ? (
                        <img 
                          src={account.logo_url} 
                          alt={account.name}
                          className="w-8 h-8 object-contain"
                        />
                      ) : (
                        <Building2 className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{account.name}</h3>
                      {account.category && (
                        <p className="text-sm text-muted-foreground">{account.category}</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AccountSelectionPage;
