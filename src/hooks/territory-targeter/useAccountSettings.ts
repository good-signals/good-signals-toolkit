import { useState, useEffect } from 'react';
import { fetchAccountById, getSuperAdminAwareAccountId, Account } from '@/services/accountService';
import { useSuperAdminContext } from '@/contexts/SuperAdminContext';
import { toast } from '@/hooks/use-toast';

export const useAccountSettings = (userId?: string) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const { activeAccount, isImpersonating } = useSuperAdminContext();

  useEffect(() => {
    const loadAccounts = async () => {
      if (!userId) {
        setIsLoadingAccounts(false);
        return;
      }

      try {
        // If super admin is impersonating, use the active account
        if (isImpersonating && activeAccount) {
          setAccounts([activeAccount]);
        } else {
          // Otherwise get the account ID and fetch the account
          const accountId = await getSuperAdminAwareAccountId(userId, activeAccount);
          if (accountId) {
            const account = await fetchAccountById(accountId);
            if (account) {
              setAccounts([account]);
            } else {
              setAccounts([]);
            }
          } else {
            setAccounts([]);
          }
        }
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
  }, [userId, activeAccount, isImpersonating]);

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
