
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useSuperAdmin = () => {
  const { user, authLoading } = useAuth();

  const { data: isSuperAdmin = false, isLoading: superAdminLoading } = useQuery({
    queryKey: ['isSuperAdmin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .from('user_global_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .single();

      if (error) {
        console.log('User is not a super admin');
        return false;
      }
      
      return !!data;
    },
    enabled: !!user && !authLoading,
  });

  return {
    isSuperAdmin,
    isLoading: authLoading || superAdminLoading,
  };
};
