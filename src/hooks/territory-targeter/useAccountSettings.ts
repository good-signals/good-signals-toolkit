
import { useState, useEffect } from 'react';
import { fetchAccountById, Account } from '@/services/accountService';
import { getAccountSignalThresholds } from '@/services/signalThresholdsService';
import { getUserAccount } from '@/services/userAccountService';
import { toast } from '@/hooks/use-toast';

export const useAccountSettings = (userId?: string) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [accountGoodThreshold, setAccountGoodThreshold] = useState(0.75);
  const [accountBadThreshold, setAccountBadThreshold] = useState(0.50);

  const loadAccountsAndThresholds = async () => {
    if (!userId) {
      setIsLoadingAccounts(false);
      return;
    }

    try {
      // Get user's account
      const userAccount = await getUserAccount(userId);
      if (!userAccount) {
        setAccounts([]);
        setIsLoadingAccounts(false);
        return;
      }

      // For simplified version, we'll create a minimal account object
      const accountData: Account = {
        id: userAccount.id,
        name: userAccount.name,
        category: userAccount.category || '',
        subcategory: userAccount.subcategory || '',
        address: userAccount.address || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        logo_url: userAccount.logo_url
      };

      setAccounts([accountData]);

      // Fetch signal thresholds for this account
      const thresholds = await getAccountSignalThresholds(userAccount.id);
      if (thresholds) {
        console.log('Loaded signal thresholds from database:', thresholds);
        setAccountGoodThreshold(thresholds.good_threshold);
        setAccountBadThreshold(thresholds.bad_threshold);
      } else {
        // Use defaults if no custom thresholds are set
        console.log('No custom thresholds found, using defaults');
        setAccountGoodThreshold(0.75);
        setAccountBadThreshold(0.50);
      }
    } catch (error) {
      console.error('Failed to fetch user accounts and thresholds:', error);
      toast({
        title: "Account Loading Failed",
        description: "Could not load account settings. Using default signal thresholds.",
        variant: "destructive",
      });
      setAccounts([]);
      setAccountGoodThreshold(0.75);
      setAccountBadThreshold(0.50);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  useEffect(() => {
    loadAccountsAndThresholds();
  }, [userId]);

  // Add a function to refresh thresholds that can be called externally
  const refreshThresholds = () => {
    loadAccountsAndThresholds();
  };

  const currentAccount = accounts.length > 0 ? accounts[0] : null;

  return {
    accounts,
    isLoadingAccounts,
    currentAccount,
    accountGoodThreshold,
    accountBadThreshold,
    refreshThresholds
  };
};
