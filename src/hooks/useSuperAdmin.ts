
import { useAuth } from '@/contexts/AuthContext';

export const useSuperAdmin = () => {
  const { user } = useAuth();
  
  // Check if the user is the super admin based on email
  const isSuperAdmin = user?.email === 'howdy@goodsignals.ai';
  
  return {
    isSuperAdmin,
  };
};
