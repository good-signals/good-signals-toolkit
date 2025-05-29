
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getSiteAssessmentsForUser, deleteSiteAssessment } from '@/services/siteAssessmentService';
import { SiteAssessment } from '@/types/siteAssessmentTypes';
import { toast } from "@/components/ui/use-toast";

export const useSiteAssessmentOperations = (currentStep: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { 
    data: assessments = [], 
    isLoading: isLoadingAssessments, 
    error: assessmentsError,
    refetch: refetchAssessments,
  } = useQuery<SiteAssessment[], Error>({
    queryKey: ['siteAssessments', user?.id],
    queryFn: async () => {
      console.log('Fetching site assessments for user:', user?.id);
      if (!user?.id) return Promise.resolve([]);
      
      try {
        const result = await getSiteAssessmentsForUser(user.id);
        console.log('Fetched assessments:', result.length, 'items');
        return result;
      } catch (error) {
        console.error('Error fetching assessments:', error);
        queryClient.removeQueries({ queryKey: ['siteAssessments'] });
        throw error;
      }
    },
    enabled: !!user?.id && currentStep === 'idle',
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
        return false;
      }
      return failureCount < 2;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (assessmentIds: string[]) => {
      console.log('Starting deletion mutation for IDs:', assessmentIds);
      
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      
      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (const assessmentId of assessmentIds) {
        try {
          console.log(`Deleting assessment: ${assessmentId}`);
          await deleteSiteAssessment(assessmentId, user.id);
          console.log(`Successfully deleted: ${assessmentId}`);
          results.push({ id: assessmentId, success: true });
          successCount++;
        } catch (error) {
          console.error(`Failed to delete ${assessmentId}:`, error);
          results.push({ id: assessmentId, success: false, error });
          failureCount++;
        }
      }

      console.log(`Deletion results - Success: ${successCount}, Failures: ${failureCount}`);

      if (failureCount > 0) {
        const errorMessage = `Failed to delete ${failureCount} out of ${results.length} assessments`;
        throw new Error(errorMessage);
      }

      return { successCount, deletedIds: assessmentIds, results };
    },
    onSuccess: ({ successCount, deletedIds }) => { 
      console.log('Deletion mutation successful:', { successCount, deletedIds });
      
      toast({ 
        title: `Successfully deleted ${successCount} assessment${successCount > 1 ? 's' : ''}` 
      });
      
      queryClient.removeQueries({ queryKey: ['siteAssessments'] });
      queryClient.removeQueries({ queryKey: ['assessmentDetails'] });
      queryClient.removeQueries({ queryKey: ['assessmentDocuments'] });
      
      refetchAssessments();
      
      return deletedIds;
    },
    onError: (error) => {
      console.error('Deletion mutation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error deleting assessments",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  return {
    assessments,
    isLoadingAssessments,
    assessmentsError,
    refetchAssessments,
    deleteMutation,
  };
};
