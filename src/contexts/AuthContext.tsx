
import React, { createContext, useContext, ReactNode } from 'react';
import { AuthContextType } from '@/types/auth';
import { useAuthState } from '@/hooks/useAuthState';
import { useAuthOperations } from '@/hooks/useAuthOperations';

// Create the context with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Props for the AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const {
    session,
    user,
    profile,
    authLoading,
    setProfile,
    setAuthLoading,
    addActiveOperation,
    removeActiveOperation,
  } = useAuthState();

  const {
    signInWithEmail,
    resetPassword,
    updatePassword,
    signOut,
    updateContextUserProfile,
    uploadAvatarAndUpdateProfile,
  } = useAuthOperations(user, setProfile, addActiveOperation, removeActiveOperation);
  
  const value = {
    session,
    user,
    profile,
    authLoading,
    signInWithEmail,
    resetPassword,
    updatePassword,
    signOut,
    updateContextUserProfile,
    uploadAvatarAndUpdateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Re-export the UserProfile type for backward compatibility
export type { UserProfile } from '@/types/auth';
