
import React, { useState, useEffect } from 'react';
import { Check, Building2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { Account, fetchUserAccountsWithAdminRole } from '@/services/accountService';

const AccountSwitcher: React.FC = () => {
  const [availableAccounts, setAvailableAccounts] = useState<Account[]>([]);
  const { user, activeAccount, setActiveAccount } = useAuth();

  useEffect(() => {
    if (user) {
      loadAvailableAccounts();
    }
  }, [user]);

  const loadAvailableAccounts = async () => {
    if (!user) return;
    
    const accounts = await fetchUserAccountsWithAdminRole(user.id);
    setAvailableAccounts(accounts);
  };

  const handleAccountSwitch = (account: Account) => {
    setActiveAccount(account);
  };

  // Don't show switcher if user has only one account
  if (availableAccounts.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 px-2 text-gray-300 hover:text-white hover:bg-gray-800">
          <div className="flex items-center space-x-2 max-w-[200px]">
            {activeAccount?.logo_url ? (
              <img 
                src={activeAccount.logo_url} 
                alt={activeAccount.name}
                className="w-4 h-4 object-contain"
              />
            ) : (
              <Building2 className="w-4 h-4" />
            )}
            <span className="truncate text-sm">
              {activeAccount?.name || 'Select Account'}
            </span>
            <ChevronDown className="w-3 h-3" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {availableAccounts.map((account) => (
          <DropdownMenuItem
            key={account.id}
            onClick={() => handleAccountSwitch(account)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              {account.logo_url ? (
                <img 
                  src={account.logo_url} 
                  alt={account.name}
                  className="w-4 h-4 object-contain"
                />
              ) : (
                <Building2 className="w-4 h-4" />
              )}
              <span className="truncate">{account.name}</span>
            </div>
            {activeAccount?.id === account.id && (
              <Check className="w-4 h-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AccountSwitcher;
