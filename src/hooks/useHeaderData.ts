
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUserAccountsWithAdminRole, Account } from '@/services/accountService';

export const useHeaderData = () => {
  const [userAccount, setUserAccount] = useState<Account | null>(null);
  const { user, signOut, authLoading } = useAuth();

  useEffect(() => {
    if (user && !authLoading) {
      fetchUserAccountsWithAdminRole(user.id)
        .then(accounts => {
          if (accounts && accounts.length > 0) {
            setUserAccount(accounts[0]);
          }
        })
        .catch(error => {
          console.error("Failed to fetch user accounts for header:", error);
        });
    }
  }, [user, authLoading]);

  return {
    user,
    userAccount,
    signOut,
    authLoading,
  };
};
