
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
        console.log(`\n--- Processing assessment ${assessment.id} (${assessment.assessment_name}) ---`);
        
        const metricScores: (number | null)[] = [];
        let metricsWithValues = 0;
        let siteVisitRatingsWithValues = 0;
        
        // Count metrics from target metric set
        const totalMetrics = metricSet.user_custom_metrics_settings?.length || 0;
        
        // Count site visit criteria (always 10)
        const totalSiteVisitCriteria = siteVisitCriteria.length;
        
        // Calculate total completable items
        const totalCompletableItems = totalMetrics + totalSiteVisitCriteria;

        console.log(`📊 Completion Calculation Setup:`);
        console.log(`  - Total metrics in set: ${totalMetrics}`);
        console.log(`  - Total site visit criteria: ${totalSiteVisitCriteria}`);
        console.log(`  - Total completable items: ${totalCompletableItems}`);

        // Process regular metrics
        if (metricSet.user_custom_metrics_settings) {
          console.log(`🔢 Processing ${metricSet.user_custom_metrics_settings.length} metrics...`);
          for (const metricSetting of metricSet.user_custom_metrics_settings) {
            // Find the entered value for this metric in the assessment
            const metricValue = assessment.assessment_metric_values?.find(
              mv => mv.metric_identifier === metricSetting.metric_identifier
            );

            // Only count as complete if there's a non-null entered value
            if (metricValue && metricValue.entered_value !== null) {
              metricsWithValues++;
              console.log(`    ✓ Metric ${metricSetting.metric_identifier}: ${metricValue.entered_value}`);
              
              const scoreData: MetricScoreData = {
                enteredValue: metricValue.entered_value,
                targetValue: metricSetting.target_value,
                higherIsBetter: metricSetting.higher_is_better
              };

              const score = calculateMetricSignalScore(scoreData, metricSetting.metric_identifier);
              metricScores.push(score);
            } else {
              console.log(`    ✗ Metric ${metricSetting.metric_identifier}: no value`);
              metricScores.push(null);
            }
          }
        }

        // Process site visit ratings
        console.log(`🏠 Processing site visit ratings...`);
        console.log(`  - Site visit ratings in assessment:`, assessment.site_visit_ratings?.length || 0);
        
        const siteVisitGrades: string[] = [];
        
        if (assessment.site_visit_ratings && assessment.site_visit_ratings.length > 0) {
          console.log(`  - Found ${assessment.site_visit_ratings.length} site visit ratings`);
          
          for (const rating of assessment.site_visit_ratings) {
            console.log(`    - Rating for ${rating.criterion_key}: grade="${rating.rating_grade}", notes="${rating.notes}"`);
            
            // Only count ratings that have a grade (not null or empty)
            if (rating.rating_grade && rating.rating_grade.trim() !== '') {
              siteVisitRatingsWithValues++;
              siteVisitGrades.push(rating.rating_grade);
              console.log(`      ✓ Counted as complete (grade: ${rating.rating_grade})`);
            } else {
              console.log(`      ✗ Not counted (no grade)`);
            }
          }
        } else {
          console.log(`  - No site visit ratings found for this assessment`);
        }

        // Calculate total completed items
        const totalCompletedItems = metricsWithValues + siteVisitRatingsWithValues;

        console.log(`📈 Completion Summary:`);
        console.log(`  - Metrics with values: ${metricsWithValues}/${totalMetrics}`);
        console.log(`  - Site visit ratings with values: ${siteVisitRatingsWithValues}/${totalSiteVisitCriteria}`);
        console.log(`  - Total completed items: ${totalCompletedItems}/${totalCompletableItems}`);

        // Calculate overall scores including both metrics and site visit ratings
        const overallScore = calculateOverallSiteSignalScore(metricScores, siteVisitGrades);
        const completionPercentage = calculateCompletionPercentage(totalCompletableItems, totalCompletedItems);

        console.log(`🎯 Final Results:`);
        console.log(`  - Overall score: ${overallScore}`);
        console.log(`  - Completion percentage: ${completionPercentage}%`);
        console.log(`  - Calculation: (${totalCompletedItems}/${totalCompletableItems}) * 100 = ${completionPercentage}%`);

        // Update the assessment scores
        await updateAssessmentScores(assessment.id, overallScore, completionPercentage);
        updatedCount++;
        
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
