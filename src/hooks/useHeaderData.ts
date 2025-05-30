
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdminContext } from '@/contexts/SuperAdminContext';
import { fetchUserAccountsWithAdminRole, Account } from '@/services/accountService';

export const useHeaderData = () => {
  const [userAccount, setUserAccount] = useState<Account | null>(null);
  const { user, isSuperAdmin, signOut, authLoading } = useAuth();
  const { activeAccount, isImpersonating } = useSuperAdminContext();

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

  // Use the active account if super admin is impersonating, otherwise use user's own account
  const displayAccount = isImpersonating ? activeAccount : userAccount;

  return {
    user,
    userAccount: displayAccount,
    isSuperAdmin,
    signOut,
    authLoading,
  };
};
