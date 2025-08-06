import { useQuery } from '@tanstack/react-query';
import { getAssessmentDetails } from '@/services/siteAssessmentService';
import { useAuth } from '@/contexts/AuthContext';

export const useSiteAssessmentDetailsEnhanced = (assessmentId: string | undefined) => {
  const { user, authLoading } = useAuth();
  const authInitialized = !authLoading;
  
  return useQuery({
    queryKey: ['assessment-details-enhanced', assessmentId],
    queryFn: async () => {
      console.log('[useSiteAssessmentDetailsEnhanced] Fetching enhanced assessment details:', { assessmentId, userId: user?.id });
      
      if (!assessmentId) {
        throw new Error('Assessment ID is required');
      }
      if (!user) {
        throw new Error('Authentication required to fetch assessment details');
      }
      
      return getAssessmentDetails(assessmentId);
    },
    enabled: !!assessmentId && !!user && authInitialized,
    retry: (failureCount, error) => {
      console.log('[useSiteAssessmentDetailsEnhanced] Retry attempt:', failureCount, 'Error:', error.message);
      
      // Don't retry on authentication errors
      if (error.message.includes('Authentication required') || 
          error.message.includes('not found or you do not have access')) {
        return false;
      }
      
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
};