
import { supabase } from '@/integrations/supabase/client';
import { SiteAssessment, SiteAssessmentUpdate } from '@/types/siteAssessmentTypes';

export const updateAssessmentScores = async (
  assessmentId: string, 
  overallSiteSignalScore: number | null, 
  completionPercentage: number | null
): Promise<SiteAssessment> => {
  const updates: SiteAssessmentUpdate = {
    site_signal_score: overallSiteSignalScore,
    completion_percentage: completionPercentage,
    // We must include updated_at or other required fields if the table trigger doesn't handle it
    // Assuming updated_at is handled by a trigger or default value
  };

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
  
  return {
    ...updatedAssessment,
    assessment_metric_values: updatedAssessment.assessment_metric_values || [],
    site_visit_ratings: updatedAssessment.assessment_site_visit_ratings || [],
  };
};
