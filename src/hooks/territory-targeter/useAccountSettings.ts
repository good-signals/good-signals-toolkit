import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Account, fetchUserAccountsWithAdminRole } from '@/services/account';

export const useAccountSettings = () => {
  const [userAccount, setUserAccount] = useState<Account | null>(null);
  const { user, authLoading } = useAuth();

  useEffect(() => {
    if (user && !authLoading) {
      fetchUserAccountsWithAdminRole(user.id)
        .then(accounts => {
          if (accounts && accounts.length > 0) {
            setUserAccount(accounts[0]);
          }
        })
        .catch(error => {
          console.error("Failed to fetch user accounts:", error);
        });
    }
  }, [user, authLoading]);

  return { userAccount };
};

