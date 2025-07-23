
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { generateExecutiveSummaryForAssessment, updateSiteAssessmentSummary } from '@/services/siteAssessmentService';
import { getUserAccount } from '@/services/userAccountService';
import { getTargetMetricSetById, getUserCustomMetricSettings } from '@/services/targetMetricsService';
import { toast } from '@/hooks/use-toast';
import { SiteAssessment } from '@/types/siteAssessmentTypes';

export const useSiteAssessmentSummaryGeneration = (assessment: SiteAssessment) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      if (!assessment || !user) {
        throw new Error('Assessment or user not available');
      }

      console.log('[Summary Generation] Starting generation for assessment:', assessment.id);
      setIsGenerating(true);

      try {
        // Get required data for summary generation
        const [accountSettings, targetMetricSet] = await Promise.all([
          getUserAccount(user.id),
          assessment.target_metric_set_id ? getTargetMetricSetById(assessment.target_metric_set_id, user.id) : null
        ]);

        if (!targetMetricSet) {
          throw new Error('Target metric set not found');
        }

        // Get user custom metric settings
        const userCustomMetricSettings = await getUserCustomMetricSettings(assessment.target_metric_set_id!);

        // Prepare detailed metric scores
        const detailedMetricScores = new Map();
        if (assessment.assessment_metric_values) {
          assessment.assessment_metric_values.forEach(metric => {
            if (metric.category !== 'SiteVisitSectionImages') {
              const targetSetting = userCustomMetricSettings.find(s => s.metric_identifier === metric.metric_identifier);
              detailedMetricScores.set(metric.metric_identifier, {
                score: null, // This would need to be calculated based on scoring logic
                enteredValue: metric.entered_value,
                targetValue: targetSetting?.target_value,
                higherIsBetter: targetSetting?.higher_is_better,
                notes: metric.notes,
                imageUrl: metric.image_url,
                label: metric.label,
                category: metric.category
              });
            }
          });
        }

        // Prepare site visit ratings with labels
        const siteVisitRatingsWithLabels = assessment.site_visit_ratings?.map(rating => ({
          ...rating,
          label: rating.criterion_key.charAt(0).toUpperCase() + rating.criterion_key.slice(1).replace(/_/g, ' ')
        })) || [];

        // Get metric categories
        const metricCategories = [...new Set(userCustomMetricSettings.map(s => s.category))];

        // Generate the summary
        const summary = await generateExecutiveSummaryForAssessment(
          assessment,
          detailedMetricScores,
          siteVisitRatingsWithLabels,
          accountSettings,
          { ...targetMetricSet, user_custom_metrics_settings: userCustomMetricSettings },
          metricCategories
        );

        // Save the summary to the database
        await updateSiteAssessmentSummary(assessment.id, summary, user.id);

        console.log('[Summary Generation] Summary generated and saved successfully');
        return summary;
      } catch (error) {
        console.error('[Summary Generation] Error:', error);
        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    onSuccess: (summary) => {
      toast({
        title: "Executive Summary Generated",
        description: "AI-powered executive summary has been created for your site assessment.",
      });
      
      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['assessment-details', assessment.id] });
      queryClient.invalidateQueries({ queryKey: ['siteAssessments'] });
    },
    onError: (error) => {
      console.error('[Summary Generation] Mutation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      
      toast({
        title: "Summary Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const canGenerateSummary = () => {
    return assessment && 
           assessment.target_metric_set_id && 
           (assessment.assessment_metric_values?.length > 0 || assessment.site_visit_ratings?.length > 0);
  };

  const shouldAutoGenerate = () => {
    return canGenerateSummary() && 
           !assessment.executive_summary && 
           (assessment.completion_percentage || 0) > 50; // Auto-generate if >50% complete
  };

  return {
    generateSummary: generateSummaryMutation.mutate,
    isGenerating: isGenerating || generateSummaryMutation.isPending,
    canGenerateSummary: canGenerateSummary(),
    shouldAutoGenerate: shouldAutoGenerate(),
    error: generateSummaryMutation.error
  };
};
