
import { supabase } from '@/integrations/supabase/client';
import { AssessmentSiteVisitRatingInsert } from '@/types/siteAssessmentTypes';

export const saveSiteVisitRatings = async (assessmentId: string, ratings: AssessmentSiteVisitRatingInsert[]): Promise<void> => {
  // Upsert to handle both new and existing ratings for this assessment
  const ratingsToSave = ratings.map(r => ({ ...r, assessment_id: assessmentId }));
  const { error } = await supabase
    .from('assessment_site_visit_ratings')
    .upsert(ratingsToSave, { onConflict: 'assessment_id, criterion_key' });

  if (error) {
    console.error('Error saving site visit ratings:', error);
    throw error;
  }
};

export const getSiteVisitRatings = async (assessmentId: string): Promise<AssessmentSiteVisitRatingInsert[]> => {
  const { data, error } = await supabase
    .from('assessment_site_visit_ratings')
    .select('*')
    .eq('assessment_id', assessmentId);
  
  if (error) {
    console.error('Error fetching site visit ratings:', error);
    throw error;
  }
  return data || [];
};
