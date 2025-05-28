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
    .select(`
      *,
      assessment_metric_values(*),
      assessment_site_visit_ratings(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching site assessments for user:', error);
    throw error;
  }
  return (data || []).map(assessment => ({
    ...assessment,
    assessment_metric_values: assessment.assessment_metric_values || [],
    site_visit_ratings: assessment.assessment_site_visit_ratings || []
  })) as SiteAssessment[];
};

export const getSiteAssessmentById = async (assessmentId: string, userId: string): Promise<SiteAssessment | null> => {
  const { data, error } = await supabase
    .from('site_assessments')
    .select(`
      *,
      assessment_metric_values(*),
      assessment_site_visit_ratings(*)
    `)
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
  if (!data) return null;

  return {
    ...data,
    assessment_metric_values: data.assessment_metric_values || [],
    site_visit_ratings: data.assessment_site_visit_ratings || []
  } as SiteAssessment;
};

export const updateSiteAssessment = async (assessmentId: string, updates: SiteAssessmentUpdate, userId: string): Promise<SiteAssessment> => {
  const { data, error } = await supabase
    .from('site_assessments')
    .update(updates)
    .eq('id', assessmentId)
    .eq('user_id', userId) // Ensure user owns this assessment
    .select(`
      *,
      assessment_metric_values(*),
      assessment_site_visit_ratings(*)
    `)
    .single();

  if (error) {
    console.error('Error updating site assessment:', error);
    throw error;
  }
  return {
    ...data,
    assessment_metric_values: data.assessment_metric_values || [],
    site_visit_ratings: data.assessment_site_visit_ratings || [] // Corrected property name
  } as SiteAssessment;
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

export const getAssessmentDetails = async (assessmentId: string): Promise<SiteAssessment> => {
  // Fetch the main assessment
  const { data: assessmentData, error: assessmentError } = await supabase
    .from('site_assessments')
    .select('*')
    .eq('id', assessmentId)
    .single();

  if (assessmentError) {
    console.error('Error fetching site assessment core data:', assessmentError);
    throw assessmentError;
  }
  if (!assessmentData) {
    throw new Error(`Site assessment with ID ${assessmentId} not found.`);
  }

  // Fetch related metric values
  const { data: metricValues, error: metricsError } = await supabase
    .from('assessment_metric_values')
    .select('*')
    .eq('assessment_id', assessmentId);

  if (metricsError) {
    console.error('Error fetching assessment metric values:', metricsError);
    // Decide if this is a critical error or if we can proceed without metrics
    // For now, let's proceed and return empty array or handle in UI
  }

  // Fetch related site visit ratings
  const { data: siteVisitRatingsData, error: ratingsError } = await supabase
    .from('assessment_site_visit_ratings')
    .select('*')
    .eq('assessment_id', assessmentId);
  
  if (ratingsError) {
    console.error('Error fetching site visit ratings:', ratingsError);
    // Decide if this is a critical error
  }
  
  // Combine and return
  return {
    ...assessmentData,
    assessment_metric_values: metricValues || [],
    site_visit_ratings: siteVisitRatingsData || [], // Ensure mapping to site_visit_ratings
  };
};

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
