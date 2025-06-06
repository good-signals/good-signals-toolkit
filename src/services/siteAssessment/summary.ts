
import { supabase } from '@/integrations/supabase/client';
import { SiteAssessment } from '@/types/siteAssessmentTypes';
import { getAccountThresholds } from '../targetMetrics/accountHelpers';

export const generateExecutiveSummary = async (
  assessmentId: string,
  account: any = null
): Promise<{ success: boolean; summary?: string; error?: string }> => {
  const { goodThreshold, badThreshold } = await getAccountThresholds(account);

  try {
    const { data: assessment, error: assessmentError } = await supabase
      .from('site_assessments')
      .select('*')
      .eq('id', assessmentId)
      .single();

    if (assessmentError) {
      console.error("Error fetching site assessment:", assessmentError);
      return { success: false, error: 'Failed to fetch site assessment.' };
    }

    if (!assessment) {
      return { success: false, error: 'Site assessment not found.' };
    }

    // Fix table name: use correct table name from database schema
    const { data: metricValues, error: metricValuesError } = await supabase
      .from('assessment_metric_values')
      .select('*')
      .eq('assessment_id', assessmentId);

    if (metricValuesError) {
      console.error("Error fetching metric values:", metricValuesError);
      return { success: false, error: 'Failed to fetch metric values.' };
    }

    // Fix table name: use correct table name from database schema
    const { data: siteVisitRatings, error: siteVisitRatingsError } = await supabase
      .from('assessment_site_visit_ratings')
      .select('*')
      .eq('assessment_id', assessmentId);

    if (siteVisitRatingsError) {
      console.error("Error fetching site visit ratings:", siteVisitRatingsError);
      return { success: false, error: 'Failed to fetch site visit ratings.' };
    }

    // Calculate overall site signal score
    const overallSiteSignalScore = assessment.site_signal_score || 0;

    // Determine site signal status based on thresholds
    let siteSignalStatus = 'Neutral';
    if (overallSiteSignalScore >= goodThreshold) {
      siteSignalStatus = 'Good';
    } else if (overallSiteSignalScore <= badThreshold) {
      siteSignalStatus = 'Bad';
    }

    // Generate summary
    let summary = `Executive Summary for ${assessment.assessment_name}:\n\n`;
    summary += `Overall Site Signal Score: ${overallSiteSignalScore.toFixed(2)} (${siteSignalStatus})\n\n`;
    summary += "Key Findings:\n";

    // Handle metric values if they exist and have the entered_value property
    if (metricValues && metricValues.length > 0) {
      // Sort by entered_value instead of normalized_value since that's what exists in the database
      const sortedMetrics = metricValues.sort((a, b) => b.entered_value - a.entered_value);
      const topPositiveMetrics = sortedMetrics.slice(0, 3);
      const topNegativeMetrics = sortedMetrics.slice(-3).reverse();

      summary += "Top Positive Metrics:\n";
      topPositiveMetrics.forEach(metric => {
        summary += `- ${metric.metric_identifier}: ${metric.entered_value}\n`;
      });

      summary += "\nTop Negative Metrics:\n";
      topNegativeMetrics.forEach(metric => {
        summary += `- ${metric.metric_identifier}: ${metric.entered_value}\n`;
      });
    } else {
      summary += "No metric values available for analysis.\n";
    }

    // Summarize site visit ratings
    summary += "\nSite Visit Ratings Summary:\n";
    if (!siteVisitRatings || siteVisitRatings.length === 0) {
      summary += "No site visit ratings available.\n";
    } else {
      siteVisitRatings.forEach(rating => {
        summary += `- ${rating.criterion_key}: ${rating.rating_grade}\n`;
      });
    }

    return { success: true, summary };

  } catch (error) {
    console.error("Error generating executive summary:", error);
    return { success: false, error: 'Failed to generate executive summary.' };
  }
};

// Updated function to properly call the AI Edge Function
export const generateExecutiveSummaryForAssessment = async (
  assessment: SiteAssessment,
  detailedMetricScores: Map<string, { score: number | null; enteredValue: any; targetValue: any; higherIsBetter: boolean; notes: string | null; imageUrl: string | null }>,
  siteVisitRatingsWithLabels: any[],
  accountSettings: any,
  targetMetricSet: any,
  metricCategories: string[]
): Promise<string> => {
  console.log('[Summary Service] Starting AI executive summary generation for assessment:', assessment.id);
  
  try {
    // Convert Map to plain object for Edge Function
    const detailedMetricScoresObject: Record<string, any> = {};
    detailedMetricScores.forEach((value, key) => {
      detailedMetricScoresObject[key] = {
        ...value,
        label: targetMetricSet?.user_custom_metrics_settings?.find((s: any) => s.metric_identifier === key)?.label || key,
        category: targetMetricSet?.user_custom_metrics_settings?.find((s: any) => s.metric_identifier === key)?.category || 'Unknown'
      };
    });

    // Prepare data for the Edge Function
    const requestData = {
      assessmentName: assessment.assessment_name,
      address: assessment.address_line1,
      overallSiteSignalScore: assessment.site_signal_score,
      completionPercentage: assessment.completion_percentage,
      detailedMetricScores: detailedMetricScoresObject,
      siteVisitRatings: siteVisitRatingsWithLabels,
      accountSignalGoodThreshold: accountSettings?.signal_good_threshold || 0.75,
      accountSignalBadThreshold: accountSettings?.signal_bad_threshold || 0.50,
      metricCategories,
      targetMetricSet
    };

    console.log('[Summary Service] Calling generate-executive-summary Edge Function with data:', {
      assessmentName: requestData.assessmentName,
      metricsCount: Object.keys(detailedMetricScoresObject).length,
      ratingsCount: siteVisitRatingsWithLabels.length,
      categoriesCount: metricCategories.length
    });

    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke('generate-executive-summary', {
      body: requestData
    });

    if (error) {
      console.error('[Summary Service] Edge Function error:', error);
      throw new Error(`AI summary generation failed: ${error.message}`);
    }

    if (!data || !data.executiveSummary) {
      console.error('[Summary Service] No summary returned from Edge Function:', data);
      throw new Error('AI summary generation did not return content.');
    }

    console.log('[Summary Service] AI executive summary generated successfully, length:', data.executiveSummary.length);
    return data.executiveSummary;

  } catch (error) {
    console.error('[Summary Service] Error in generateExecutiveSummaryForAssessment:', error);
    
    // Fallback to basic summary if AI generation fails
    console.log('[Summary Service] Falling back to basic summary generation');
    let fallbackSummary = `Executive Summary for ${assessment.assessment_name}:\n\n`;
    
    if (assessment.site_signal_score !== null) {
      fallbackSummary += `Overall Site Signal Score: ${assessment.site_signal_score.toFixed(2)}\n\n`;
    }
    
    fallbackSummary += "Assessment completed with the following data:\n";
    fallbackSummary += `- ${detailedMetricScores.size} metrics evaluated\n`;
    fallbackSummary += `- ${siteVisitRatingsWithLabels.length} site visit ratings\n`;
    fallbackSummary += `- Completion: ${assessment.completion_percentage || 0}%\n\n`;
    fallbackSummary += "Note: This is a basic summary. AI-powered summary generation failed and may need administrator attention.\n";
    
    return fallbackSummary;
  }
};

export const updateSiteAssessmentSummary = async (
  assessmentId: string,
  summary: string,
  userId: string
): Promise<void> => {
  const { error } = await supabase
    .from('site_assessments')
    .update({
      executive_summary: summary,
      last_summary_generated_at: new Date().toISOString()
    })
    .eq('id', assessmentId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating assessment summary:', error);
    throw error;
  }
};
