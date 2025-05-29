
import { supabase } from '@/integrations/supabase/client';
import { SiteAssessment } from '@/types/siteAssessmentTypes';

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

  // Convert scores to percentages (0-100) for consistent database storage
  const scoreAsPercentage = overallSiteSignalScore !== null ? overallSiteSignalScore * 100 : null;
  const completionAsPercentage = completionPercentage !== null ? completionPercentage * 100 : null;

  const { data, error } = await supabase
    .from('site_assessments')
    .update({
      site_signal_score: scoreAsPercentage,
      completion_percentage: completionAsPercentage,
      updated_at: new Date().toISOString()
    })
    .eq('id', assessmentId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating assessment scores:', error);
    throw new Error(`Failed to update assessment scores: ${error.message}`);
  }

  if (!data) {
    throw new Error('No data returned after updating assessment scores');
  }

  console.log('Assessment scores updated successfully:', {
    id: data.id,
    newScore: data.site_signal_score,
    newCompletion: data.completion_percentage
  });

  return data;
};
