
import { supabase } from '@/integrations/supabase/client';
import { SiteAssessment, SiteAssessmentUpdate } from '@/types/siteAssessmentTypes';

export const updateAssessmentScores = async (
  assessmentId: string, 
  overallSiteSignalScore: number | null, 
  completionPercentage: number | null
): Promise<SiteAssessment> => {
  console.log('Updating assessment scores:', {
    assessmentId,
    overallSiteSignalScore,
    completionPercentage
  });

  // Ensure scores are stored as percentages (0-100) in the database
  const normalizedScore = overallSiteSignalScore !== null && overallSiteSignalScore !== undefined
    ? Math.round(Math.max(0, Math.min(overallSiteSignalScore, 100)))
    : null;
  
  const normalizedCompletion = completionPercentage !== null && completionPercentage !== undefined
    ? Math.round(Math.max(0, Math.min(completionPercentage, 100)))
    : null;

  const updates: SiteAssessmentUpdate = {
    site_signal_score: normalizedScore,
    completion_percentage: normalizedCompletion,
  };

  console.log('Normalized scores for database:', {
    normalizedScore,
    normalizedCompletion
  });

  try {
    // Fetch all related data after update to return complete SiteAssessment
    const { data: updatedAssessment, error: updateError } = await supabase
      .from('site_assessments')
      .update(updates)
      .eq('id', assessmentId)
      .select(`
        *,
        assessment_metric_values(*),
        assessment_site_visit_ratings(*)
      `)
      .single();

    if (updateError) {
      console.error('Error updating assessment scores:', updateError);
      throw updateError;
    }
    
    console.log('Successfully updated assessment scores:', updatedAssessment);
    
    return {
      ...updatedAssessment,
      assessment_metric_values: updatedAssessment.assessment_metric_values || [],
      site_visit_ratings: updatedAssessment.assessment_site_visit_ratings || [],
    };
  } catch (error) {
    console.error('Failed to update assessment scores:', error);
    throw error;
  }
};
