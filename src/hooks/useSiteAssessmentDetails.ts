
import { useQuery } from '@tanstack/react-query';
import { getAssessmentDetails } from '@/services/siteAssessmentService';

export const useSiteAssessmentDetails = (assessmentId: string | undefined) => {
  return useQuery({
    queryKey: ['assessment-details', assessmentId],
    queryFn: () => {
      if (!assessmentId) {
        throw new Error('Assessment ID is required');
      }
      return getAssessmentDetails(assessmentId);
    },
    enabled: !!assessmentId,
  });
};
