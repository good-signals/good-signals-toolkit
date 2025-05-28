
import { supabase } from '@/integrations/supabase/client';
import { SiteAssessment, SiteAssessmentInsert, SiteAssessmentUpdate } from '@/types/siteAssessmentTypes';

export const createSiteAssessmentInDb = async (
  assessmentData: Omit<SiteAssessmentInsert, 'user_id' | 'account_id' | 'target_metric_set_id'>,
  userId: string
): Promise<SiteAssessment> => {
  console.log('Creating site assessment:', { assessmentData, userId });

  // First, get the user's account
  const { data: accountMemberships, error: membershipError } = await supabase
    .from('account_memberships')
    .select('account_id')
    .eq('user_id', userId)
    .limit(1);

  if (membershipError) {
    console.error('Error fetching account membership:', membershipError);
    throw new Error(`Failed to get account membership: ${membershipError.message}`);
  }

  if (!accountMemberships || accountMemberships.length === 0) {
    throw new Error('User does not belong to any account');
  }

  const accountId = accountMemberships[0].account_id;

  const { data, error } = await supabase
    .from('site_assessments')
    .insert({
      ...assessmentData,
      user_id: userId,
      account_id: accountId,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating site assessment:', error);
    throw new Error(`Failed to create site assessment: ${error.message}`);
  }

  return data;
};

export const updateSiteAssessmentInDb = async (
  assessmentId: string,
  updates: Partial<SiteAssessmentUpdate>,
  userId: string
): Promise<SiteAssessment> => {
  console.log('Updating site assessment:', { assessmentId, updates, userId });

  const { data, error } = await supabase
    .from('site_assessments')
    .update(updates)
    .eq('id', assessmentId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating site assessment:', error);
    throw new Error(`Failed to update site assessment: ${error.message}`);
  }

  return data;
};

export const deleteSiteAssessmentFromDb = async (
  assessmentId: string,
  userId: string
): Promise<void> => {
  console.log('Deleting site assessment:', { assessmentId, userId });

  const { error } = await supabase
    .from('site_assessments')
    .delete()
    .eq('id', assessmentId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting site assessment:', error);
    throw new Error(`Failed to delete site assessment: ${error.message}`);
  }
};

export const getSiteAssessmentFromDb = async (assessmentId: string): Promise<SiteAssessment> => {
  console.log('Fetching site assessment:', assessmentId);

  const { data, error } = await supabase
    .from('site_assessments')
    .select('*')
    .eq('id', assessmentId)
    .single();

  if (error) {
    console.error('Error fetching site assessment:', error);
    throw new Error(`Failed to fetch site assessment: ${error.message}`);
  }

  return data;
};

export const getSiteAssessmentsFromDb = async (userId: string): Promise<SiteAssessment[]> => {
  console.log('Fetching site assessments for user:', userId);

  const { data, error } = await supabase
    .from('site_assessments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching site assessments:', error);
    throw new Error(`Failed to fetch site assessments: ${error.message}`);
  }

  return data || [];
};

// New function to update site status
export const updateSiteStatusInDb = async (
  assessmentId: string,
  siteStatus: string,
  userId: string
): Promise<SiteAssessment> => {
  console.log('Updating site status:', { assessmentId, siteStatus, userId });

  const { data, error } = await supabase
    .from('site_assessments')
    .update({ site_status: siteStatus })
    .eq('id', assessmentId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating site status:', error);
    throw new Error(`Failed to update site status: ${error.message}`);
  }

  return data;
};
