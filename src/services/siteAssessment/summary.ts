import { supabase } from '@/integrations/supabase/client';
import { SiteAssessment, SiteAssessmentUpdate } from '@/types/siteAssessmentTypes';
import { Account } from '@/services/accountService';
import { TargetMetricSet } from '@/types/targetMetrics';

export const generateExecutiveSummaryForAssessment = async (
  assessment: SiteAssessment,
  detailedMetricScores: Map<string, { score: number | null; enteredValue: any; targetValue: any; higherIsBetter: boolean; notes?: string | null; imageUrl?: string | null }>,
  siteVisitRatingsWithLabels: Array<{ criterion_key: string; rating_grade: string; notes?: string | null; rating_description?: string | null; label: string }>,
  accountSettings: Account | null,
  targetMetricSet: TargetMetricSet | null,
  metricCategories: string[]
): Promise<string> => {
  if (!assessment || !targetMetricSet) {
    throw new Error("Assessment data or target metric set is missing for summary generation.");
  }

  // Convert Map to a plain object for JSON serialization
  const detailedMetricScoresObject = Object.fromEntries(detailedMetricScores);

  const payload = {
    assessmentName: assessment.assessment_name,
    address: assessment.address_line1,
    overallSiteSignalScore: assessment.site_signal_score,
    completionPercentage: assessment.completion_percentage,
    detailedMetricScores: detailedMetricScoresObject,
    siteVisitRatings: siteVisitRatingsWithLabels,
    accountSignalGoodThreshold: accountSettings?.signal_good_threshold,
    accountSignalBadThreshold: accountSettings?.signal_bad_threshold,
    metricCategories: metricCategories,
    targetMetricSet: {
        name: targetMetricSet.name, // Add the target metric set name
        user_custom_metrics_settings: targetMetricSet.user_custom_metrics_settings?.map(s => ({
            metric_identifier: s.metric_identifier,
            label: s.label,
            category: s.category
        })) || []
    }
  };

  console.log("Invoking generate-executive-summary function with payload:", JSON.stringify(payload, null, 2));

  const { data, error } = await supabase.functions.invoke('generate-executive-summary', {
    body: payload,
  });

  if (error) {
    console.error('Error invoking generate-executive-summary function:', error);
    throw new Error(`Failed to generate executive summary: ${error.message}`);
  }

  if (!data || !data.executiveSummary) {
    console.error('No summary content returned from edge function:', data);
    throw new Error('Executive summary generation did not return content.');
  }

  return data.executiveSummary;
};

export const updateSiteAssessmentSummary = async (
  assessmentId: string,
  executiveSummary: string,
  userId: string
): Promise<SiteAssessment> => {
  const updates: SiteAssessmentUpdate = {
    executive_summary: executiveSummary,
    last_summary_generated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('site_assessments')
    .update(updates)
    .eq('id', assessmentId)
    .select(`
      *,
      assessment_metric_values(*),
      assessment_site_visit_ratings(*)
    `)
    .single();

  if (error) {
    console.error('Error updating site assessment with executive summary:', error);
    throw error;
  }
   return {
    ...data,
    assessment_metric_values: data.assessment_metric_values || [],
    site_visit_ratings: data.assessment_site_visit_ratings || [] 
  } as SiteAssessment;
};
