
import { useState, useEffect } from 'react';
import { fetchAccountById, Account } from '@/services/accountService';
import { toast } from '@/hooks/use-toast';

export const useAccountSettings = (userId?: string) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);

  useEffect(() => {
    const loadAccounts = async () => {
      if (!userId) {
        setIsLoadingAccounts(false);
        return;
      }

      try {
        // For the simplified version, we'll just use default thresholds
        // since signal thresholds were removed from the accounts table
        setAccounts([]);
      } catch (error) {
        console.error('Failed to fetch user accounts:', error);
        toast({
          title: "Account Loading Failed",
          description: "Could not load account settings. Using default signal thresholds.",
          variant: "destructive",
        });
        setAccounts([]);
      } finally {
        setIsLoadingAccounts(false);
      }
    };

    loadAccounts();
  }, [userId]);

  // Use default thresholds since signal thresholds were removed
  const currentAccount = accounts.length > 0 ? accounts[0] : null;
  const accountGoodThreshold = 0.75;
  const accountBadThreshold = 0.50;

  return {
    accounts,
    isLoadingAccounts,
    currentAccount,
    accountGoodThreshold,
    accountBadThreshold
  };
};
