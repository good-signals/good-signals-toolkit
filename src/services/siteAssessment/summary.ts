
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
