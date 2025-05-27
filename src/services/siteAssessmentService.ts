import { supabase } from '@/integrations/supabase/client';
import { 
  SiteAssessment, 
  SiteAssessmentInsert, 
  SiteAssessmentUpdate, 
  AssessmentSiteVisitRatingInsert,
  AssessmentMetricValue,
  AssessmentMetricValueInsert
} from '@/types/siteAssessmentTypes';
import { Account, fetchUserAccountsWithAdminRole } from '@/services/accountService'; 

export const createSiteAssessment = async (assessmentData: Omit<SiteAssessmentInsert, 'user_id' | 'account_id'>, userId: string): Promise<SiteAssessment> => {
  // Fetch user's first admin account
  const accounts = await fetchUserAccountsWithAdminRole(userId);
  if (!accounts || accounts.length === 0) {
    throw new Error("User does not have an admin role in any account or no accounts found.");
  }
  const accountId = accounts[0].id;

  const { data, error } = await supabase
    .from('site_assessments')
    .insert([{ ...assessmentData, user_id: userId, account_id: accountId }])
    .select()
    .single();

  if (error) {
    console.error('Error creating site assessment:', error);
    throw error;
  }
  return data;
};

export const getSiteAssessmentsForUser = async (userId: string): Promise<SiteAssessment[]> => {
  const { data, error } = await supabase
    .from('site_assessments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching site assessments:', error);
    throw error;
  }
  return data || [];
};

export const getSiteAssessmentById = async (assessmentId: string, userId: string): Promise<SiteAssessment | null> => {
  const { data, error } = await supabase
    .from('site_assessments')
    .select('*')
    .eq('id', assessmentId)
    .eq('user_id', userId) 
    .single();

  if (error) {
    if (error.code === 'PGRST116') { 
        return null; 
    }
    console.error('Error fetching site assessment by ID:', error);
    throw error;
  }
  return data;
};

export const updateSiteAssessment = async (assessmentId: string, updates: SiteAssessmentUpdate, userId: string): Promise<SiteAssessment> => {
  const { data, error } = await supabase
    .from('site_assessments')
    .update(updates)
    .eq('id', assessmentId)
    .eq('user_id', userId) // Ensure user owns this assessment
    .select('*')
    .single();

  if (error) {
    console.error('Error updating site assessment:', error);
    throw error;
  }
  return data;
};

export const deleteSiteAssessment = async (assessmentId: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('site_assessments')
    .delete()
    .eq('id', assessmentId)
    .eq('user_id', userId); // Ensure user owns this assessment

  if (error) {
    console.error('Error deleting site assessment:', error);
    throw error;
  }
};

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

export const saveAssessmentMetricValues = async (
  assessmentId: string,
  metricValues: AssessmentMetricValueInsert[]
): Promise<AssessmentMetricValue[]> => {
  const valuesToSave = metricValues.map(mv => ({
    ...mv,
    assessment_id: assessmentId,
  }));

  const { data, error } = await supabase
    .from('assessment_metric_values')
    .upsert(valuesToSave, { onConflict: 'assessment_id, metric_identifier' })
    .select();

  if (error) {
    console.error('Error saving assessment metric values:', error);
    throw error;
  }
  return data || [];
};

export const getAssessmentMetricValues = async (assessmentId: string): Promise<AssessmentMetricValue[]> => {
  const { data, error } = await supabase
    .from('assessment_metric_values')
    .select('*')
    .eq('assessment_id', assessmentId);

  if (error) {
    console.error('Error fetching assessment metric values:', error);
    throw error;
  }
  return data || [];
};
