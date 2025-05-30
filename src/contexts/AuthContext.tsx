
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { signOutService } from '@/services/authService';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Account } from '@/services/accountService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  activeAccount: Account | null;
  setActiveAccount: (account: Account | null) => void;
  isSuperAdmin: boolean;
  signOut: () => Promise<void>;
  authLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const { isSuperAdmin } = useSuperAdmin();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Clear active account when user signs out
        if (!session?.user) {
          setActiveAccount(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    setActiveAccount(null);
    await signOutService();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        activeAccount,
        setActiveAccount,
        isSuperAdmin,
        signOut,
        authLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
