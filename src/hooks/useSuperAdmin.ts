
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export const useSuperAdmin = () => {
  const { user, authLoading, isSuperAdmin } = useAuth();

  // Since we now get isSuperAdmin from AuthContext, we don't need a separate query
  return {
    isSuperAdmin,
    isLoading: authLoading,
  };
};
