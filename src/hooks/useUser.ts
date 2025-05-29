
import { useAuth } from '@/contexts/AuthContext';

export const useUser = () => {
  const { user, authLoading, ...rest } = useAuth();
  
  return {
    user,
    authLoading,
    ...rest
  };
};
