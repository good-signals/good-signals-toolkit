
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Account } from '@/services/accountService';
import { useAuth } from './AuthContext';

interface SuperAdminContextType {
  activeAccount: Account | null;
  setActiveAccount: (account: Account | null) => void;
  isImpersonating: boolean;
  setIsImpersonating: (impersonating: boolean) => void;
  exitImpersonation: () => void;
}

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined);

interface SuperAdminProviderProps {
  children: ReactNode;
}

export const SuperAdminProvider: React.FC<SuperAdminProviderProps> = ({ children }) => {
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const { isSuperAdmin } = useAuth();

  // Clear impersonation state if user is no longer super admin
  useEffect(() => {
    if (!isSuperAdmin && isImpersonating) {
      setActiveAccount(null);
      setIsImpersonating(false);
    }
  }, [isSuperAdmin, isImpersonating]);

  const exitImpersonation = () => {
    setActiveAccount(null);
    setIsImpersonating(false);
  };

  return (
    <SuperAdminContext.Provider
      value={{
        activeAccount,
        setActiveAccount,
        isImpersonating,
        setIsImpersonating,
        exitImpersonation,
      }}
    >
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
