
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Account } from '@/services/accountService';

interface SuperAdminContextType {
  activeAccount: Account | null;
  setActiveAccount: (account: Account | null) => void;
  isImpersonating: boolean;
  startImpersonation: (account: Account) => void;
  stopImpersonation: () => void;
}

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined);

interface SuperAdminProviderProps {
  children: ReactNode;
}

export const SuperAdminProvider: React.FC<SuperAdminProviderProps> = ({ children }) => {
  const { user, isSuperAdmin } = useAuth();
  const [impersonatedAccount, setImpersonatedAccount] = useState<Account | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const startImpersonation = (account: Account) => {
    if (isSuperAdmin) {
      console.log('Starting impersonation for account:', account.name);
      setImpersonatedAccount(account);
      setIsImpersonating(true);
    }
  };

  const stopImpersonation = () => {
    console.log('Stopping impersonation');
    setImpersonatedAccount(null);
    setIsImpersonating(false);
  };

  const setActiveAccount = (account: Account | null) => {
    if (isImpersonating) {
      console.log('Setting impersonated account:', account?.name);
      setImpersonatedAccount(account);
    }
  };

  const contextValue: SuperAdminContextType = {
    activeAccount: impersonatedAccount,
    setActiveAccount,
    isImpersonating,
    startImpersonation,
    stopImpersonation,
  };

  return (
    <SuperAdminContext.Provider value={contextValue}>
      {children}
    </SuperAdminContext.Provider>
  );
};

export const useSuperAdminContext = () => {
  const context = useContext(SuperAdminContext);
  if (context === undefined) {
    throw new Error('useSuperAdminContext must be used within a SuperAdminProvider');
  }
  return context;
};
