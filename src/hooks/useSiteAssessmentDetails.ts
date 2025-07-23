
import { useQuery } from '@tanstack/react-query';
import { getAssessmentDetails } from '@/services/siteAssessmentService';
import { useAuth } from '@/contexts/AuthContext';

export const useSiteAssessmentDetails = (assessmentId: string | undefined) => {
  const { user, authLoading } = useAuth();
  
  return useQuery({
    queryKey: ['assessment-details', assessmentId],
    queryFn: () => {
      if (!assessmentId) {
        throw new Error('Assessment ID is required');
      }
      if (!user) {
        throw new Error('Authentication required to fetch assessment details');
      }
      return getAssessmentDetails(assessmentId);
    },
    enabled: !!assessmentId && !!user && !authLoading,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error.message.includes('Authentication required') || 
          error.message.includes('not found or you do not have access')) {
        return false;
      }
      return failureCount < 3;
    },
  });
};
