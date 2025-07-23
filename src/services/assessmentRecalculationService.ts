
import { supabase } from '@/integrations/supabase/client';
import { SiteAssessment } from '@/types/siteAssessmentTypes';
import { TargetMetricSet } from '@/types/targetMetrics';
import { calculateMetricSignalScore, calculateOverallSiteSignalScore, calculateCompletionPercentage } from '@/lib/signalScoreUtils';
import { updateAssessmentScores } from './siteAssessmentService';
import { siteVisitCriteria } from '@/types/siteAssessmentTypes';

interface MetricScoreData {
  enteredValue: number | null;
  targetValue: number | null;
  higherIsBetter: boolean;
}

export const recalculateAssessmentScoresForMetricSet = async (
  metricSetId: string,
  userId: string
): Promise<{ updated: number; errors: string[] }> => {
  console.log('Starting recalculation for metric set:', metricSetId);
  
  try {
    // Get all assessments using this metric set, including site visit ratings
    const { data: assessments, error: assessmentsError } = await supabase
      .from('site_assessments')
      .select(`
        *,
        assessment_metric_values(*),
        site_visit_ratings:assessment_site_visit_ratings(*)
      `)
      .eq('target_metric_set_id', metricSetId)
      .eq('user_id', userId);

    if (assessmentsError) {
      console.error('Error fetching assessments:', assessmentsError);
      return { updated: 0, errors: [assessmentsError.message] };
    }

    if (!assessments || assessments.length === 0) {
      console.log('No assessments found for metric set:', metricSetId);
      return { updated: 0, errors: [] };
    }

    // Get the updated target metric set
    const { data: metricSet, error: metricSetError } = await supabase
      .from('target_metric_sets')
      .select(`
        *,
        user_custom_metrics_settings:user_custom_metrics_settings(*)
      `)
      .eq('id', metricSetId)
      .single();

    if (metricSetError || !metricSet) {
      console.error('Error fetching metric set:', metricSetError);
      return { updated: 0, errors: [metricSetError?.message || 'Metric set not found'] };
    }

    const errors: string[] = [];
    let updatedCount = 0;

    // Recalculate scores for each assessment
    for (const assessment of assessments) {
      try {
        const metricScores: (number | null)[] = [];
        let metricsWithValues = 0;
        let siteVisitRatingsWithValues = 0;
        
        // Count metrics from target metric set
        const totalMetrics = metricSet.user_custom_metrics_settings?.length || 0;
        
        // Count site visit criteria (always 10)
        const totalSiteVisitCriteria = siteVisitCriteria.length;
        
        // Calculate total completable items
        const totalCompletableItems = totalMetrics + totalSiteVisitCriteria;

        // Process regular metrics
        if (metricSet.user_custom_metrics_settings) {
          for (const metricSetting of metricSet.user_custom_metrics_settings) {
            // Find the entered value for this metric in the assessment
            const metricValue = assessment.assessment_metric_values?.find(
              mv => mv.metric_identifier === metricSetting.metric_identifier
            );

            // Only count as complete if there's a non-null entered value
            if (metricValue && metricValue.entered_value !== null) {
              metricsWithValues++;
              
              const scoreData: MetricScoreData = {
                enteredValue: metricValue.entered_value,
                targetValue: metricSetting.target_value,
                higherIsBetter: metricSetting.higher_is_better
              };

              const score = calculateMetricSignalScore(scoreData, metricSetting.metric_identifier);
              metricScores.push(score);
            } else {
              metricScores.push(null);
            }
          }
        }

        // Process site visit ratings
        if (assessment.site_visit_ratings) {
          for (const rating of assessment.site_visit_ratings) {
            // Only count ratings that have a grade (not null or empty)
            if (rating.rating_grade) {
              siteVisitRatingsWithValues++;
            }
          }
        }

        // Calculate total completed items
        const totalCompletedItems = metricsWithValues + siteVisitRatingsWithValues;

        // Calculate overall scores
        const overallScore = calculateOverallSiteSignalScore(metricScores);
        const completionPercentage = calculateCompletionPercentage(totalCompletableItems, totalCompletedItems);

        // Update the assessment scores
        await updateAssessmentScores(assessment.id, overallScore, completionPercentage);
        updatedCount++;
        
        console.log(`Updated assessment ${assessment.id}:`, {
          score: overallScore,
          completion: completionPercentage,
          metricsWithValues,
          siteVisitRatingsWithValues,
          totalMetrics,
          totalSiteVisitCriteria,
          totalCompletableItems,
          totalCompletedItems
        });
      } catch (error) {
        console.error(`Error updating assessment ${assessment.id}:`, error);
        errors.push(`Failed to update assessment ${assessment.assessment_name || assessment.id}: ${error}`);
      }
    }

    console.log(`Recalculation complete. Updated ${updatedCount} assessments with ${errors.length} errors.`);
    return { updated: updatedCount, errors };

  } catch (error) {
    console.error('Error in recalculateAssessmentScoresForMetricSet:', error);
    return { updated: 0, errors: [error instanceof Error ? error.message : 'Unknown error occurred'] };
  }
};

export const invalidateAssessmentQueries = (queryClient: any, metricSetId: string) => {
  try {
    // Invalidate all assessment-related queries when metric set is updated
    queryClient.invalidateQueries({ queryKey: ['siteAssessments'] });
    queryClient.invalidateQueries({ queryKey: ['assessmentDetails'] });
    queryClient.invalidateQueries({ queryKey: ['targetMetricSetForDetailsView'] });
    queryClient.invalidateQueries({ queryKey: ['userAdminAccounts'] });
    
    console.log('Invalidated assessment queries for metric set:', metricSetId);
  } catch (error) {
    console.error('Error invalidating queries:', error);
  }
};
