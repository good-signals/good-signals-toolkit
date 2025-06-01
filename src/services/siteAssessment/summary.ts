import { supabase } from '@/integrations/supabase/client';
import { SiteAssessment } from '@/types/siteAssessmentTypes';
import { getAccountSignalThresholds } from '../targetMetrics/accountHelpers';

export const generateExecutiveSummary = async (
  assessmentId: string,
  account: any = null
): Promise<{ success: boolean; summary?: string; error?: string }> => {
  const { goodThreshold, badThreshold } = getAccountSignalThresholds(account);

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

    const { data: metricValues, error: metricValuesError } = await supabase
      .from('site_assessment_metric_values')
      .select('*')
      .eq('site_assessment_id', assessmentId);

    if (metricValuesError) {
      console.error("Error fetching metric values:", metricValuesError);
      return { success: false, error: 'Failed to fetch metric values.' };
    }

    const { data: siteVisitRatings, error: siteVisitRatingsError } = await supabase
      .from('site_visit_ratings')
      .select('*')
      .eq('site_assessment_id', assessmentId);

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

    // Summarize top 3 positive and negative metrics
    const sortedMetrics = metricValues.sort((a, b) => b.normalized_value - a.normalized_value);
    const topPositiveMetrics = sortedMetrics.slice(0, 3);
    const topNegativeMetrics = sortedMetrics.slice(-3).reverse();

    summary += "Top Positive Metrics:\n";
    topPositiveMetrics.forEach(metric => {
      summary += `- ${metric.metric_identifier}: ${metric.normalized_value.toFixed(2)}\n`;
    });

    summary += "\nTop Negative Metrics:\n";
    topNegativeMetrics.forEach(metric => {
      summary += `- ${metric.metric_identifier}: ${metric.normalized_value.toFixed(2)}\n`;
    });

    // Summarize site visit ratings
    summary += "\nSite Visit Ratings Summary:\n";
    if (siteVisitRatings.length === 0) {
      summary += "No site visit ratings available.\n";
    } else {
      siteVisitRatings.forEach(rating => {
        summary += `- ${rating.category}: ${rating.rating}\n`;
      });
    }

    return { success: true, summary };

  } catch (error) {
    console.error("Error generating executive summary:", error);
    return { success: false, error: 'Failed to generate executive summary.' };
  }
};
