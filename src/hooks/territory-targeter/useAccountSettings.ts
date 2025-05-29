
import { useState, useEffect } from 'react';
import { fetchUserAccountsWithAdminRole, Account } from '@/services/accountService';
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
        const userAccounts = await fetchUserAccountsWithAdminRole(userId);
        setAccounts(userAccounts);
      } catch (error) {
        console.error('Failed to fetch user accounts:', error);
        toast({
          title: "Account Loading Failed",
          description: "Could not load account settings. Using default signal thresholds.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingAccounts(false);
      }
    };

    loadAccounts();
  }, [userId]);

  // Get account signal thresholds (use first account's thresholds or defaults)
  const currentAccount = accounts.length > 0 ? accounts[0] : null;
  const accountGoodThreshold = currentAccount?.signal_good_threshold ?? 0.75;
  const accountBadThreshold = currentAccount?.signal_bad_threshold ?? 0.50;

  return {
    accounts,
    isLoadingAccounts,
    currentAccount,
    accountGoodThreshold,
    accountBadThreshold
  };
};
