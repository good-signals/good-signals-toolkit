
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Account } from '@/services/accountService';
import { toast } from 'sonner';

interface SuperAdminContextType {
  activeAccount: Account | null;
  setActiveAccount: (account: Account | null) => void;
  isImpersonating: boolean;
  exitImpersonation: () => void;
}

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined);

interface SuperAdminProviderProps {
  children: ReactNode;
}

export const SuperAdminProvider: React.FC<SuperAdminProviderProps> = ({ children }) => {
  const [activeAccount, setActiveAccountState] = useState<Account | null>(null);

  const setActiveAccount = (account: Account | null) => {
    setActiveAccountState(account);
    if (account) {
      toast.success(`Now working in: ${account.name}`);
    }
  };

  const exitImpersonation = () => {
    setActiveAccountState(null);
    toast.info('Exited account context');
  };

  const isImpersonating = activeAccount !== null;

  const value = {
    activeAccount,
    setActiveAccount,
    isImpersonating,
    exitImpersonation,
  };

  return (
    <SuperAdminContext.Provider value={value}>
      {children}
    </SuperAdminContext.Provider>
  );
};

export const useSuperAdminContext = (): SuperAdminContextType => {
  const context = useContext(SuperAdminContext);
  if (context === undefined) {
    throw new Error('useSuperAdminContext must be used within a SuperAdminProvider');
  }
  return context;
};
