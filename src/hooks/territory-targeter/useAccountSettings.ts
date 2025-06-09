
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Account, fetchUserAccountsWithAdminRole } from '@/services/account';

interface AccountSettings {
  userAccount: Account | null;
  accountGoodThreshold: number | null;
  accountBadThreshold: number | null;
  refreshThresholds: () => void;
}

export const useAccountSettings = (userId?: string): AccountSettings => {
  const [userAccount, setUserAccount] = useState<Account | null>(null);
  const [accountGoodThreshold, setAccountGoodThreshold] = useState<number | null>(null);
  const [accountBadThreshold, setAccountBadThreshold] = useState<number | null>(null);
  const { user, authLoading } = useAuth();

  const fetchAccountData = async () => {
    const targetUserId = userId || user?.id;
    if (targetUserId && !authLoading) {
      try {
        const accounts = await fetchUserAccountsWithAdminRole(targetUserId);
        if (accounts && accounts.length > 0) {
          setUserAccount(accounts[0]);
          // Set default thresholds - these would normally come from the account settings
          setAccountGoodThreshold(70);
          setAccountBadThreshold(30);
        }
      } catch (error) {
        console.error("Failed to fetch user accounts:", error);
      }
    }
  };

  useEffect(() => {
    fetchAccountData();
  }, [user, authLoading, userId]);

  const refreshThresholds = () => {
    fetchAccountData();
  };

  return { 
    userAccount, 
    accountGoodThreshold, 
    accountBadThreshold, 
    refreshThresholds 
  };
};
