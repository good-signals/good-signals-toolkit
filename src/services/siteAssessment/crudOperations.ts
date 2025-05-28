
import { supabase } from '@/integrations/supabase/client';
import { 
  SiteAssessment, 
  SiteAssessmentInsert, 
  SiteAssessmentUpdate
} from '@/types/siteAssessmentTypes';
import { fetchUserAccountsWithAdminRole } from '@/services/accountService';

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
    site_visit_ratings: data.assessment_site_visit_ratings || []
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

export const getAssessmentDetails = async (assessmentId: string): Promise<SiteAssessment> => {
  console.log('Fetching assessment details for ID:', assessmentId);
  
  const { data, error } = await supabase
    .from('site_assessments')
    .select(`
      *,
      assessment_metric_values(*),
      assessment_site_visit_ratings(*)
    `)
    .eq('id', assessmentId)
    .single();

  if (error) {
    console.error('Error fetching site assessment details:', error);
    throw error;
  }
  
  if (!data) {
    throw new Error(`Site assessment with ID ${assessmentId} not found.`);
  }

  console.log('Raw assessment data:', data);

  const result = {
    ...data,
    assessment_metric_values: data.assessment_metric_values || [],
    site_visit_ratings: data.assessment_site_visit_ratings || []
  } as SiteAssessment;

  console.log('Processed assessment result:', result);
  return result;
};
