
import { supabase } from '@/integrations/supabase/client';
import { getAccountForUser } from './accountHelpers';

export interface IndividualMetricData {
  metric_identifier: string;
  label: string;
  category: string;
  target_value: number;
  higher_is_better: boolean;
  measurement_type?: string;
  units?: string;
}

export const saveIndividualMetric = async (
  userId: string,
  metricSetId: string,
  metricData: IndividualMetricData
) => {
  console.log('[saveIndividualMetric] Saving individual metric for user:', userId, 'metric set:', metricSetId);
  
  const accountId = await getAccountForUser(userId);
  if (!accountId) {
    throw new Error('No account found for user');
  }

  const { data, error } = await supabase
    .from('user_custom_metrics_settings')
    .insert({
      user_id: userId,
      account_id: accountId,
      metric_set_id: metricSetId,
      metric_identifier: metricData.metric_identifier,
      label: metricData.label,
      category: metricData.category,
      target_value: metricData.target_value,
      higher_is_better: metricData.higher_is_better,
      measurement_type: metricData.measurement_type || metricData.units || null
    })
    .select()
    .single();

  if (error) {
    console.error('[saveIndividualMetric] Error saving individual metric:', error);
    throw error;
  }

  console.log('[saveIndividualMetric] Successfully saved individual metric:', data.id);
  return data;
};

export const updateIndividualMetric = async (
  userId: string,
  metricId: string,
  metricData: Partial<IndividualMetricData>
) => {
  console.log('[updateIndividualMetric] Updating individual metric:', metricId);
  
  const { data, error } = await supabase
    .from('user_custom_metrics_settings')
    .update({
      label: metricData.label,
      target_value: metricData.target_value,
      higher_is_better: metricData.higher_is_better,
      measurement_type: metricData.measurement_type || metricData.units || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', metricId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('[updateIndividualMetric] Error updating individual metric:', error);
    throw error;
  }

  console.log('[updateIndividualMetric] Successfully updated individual metric:', data.id);
  return data;
};

export const deleteIndividualMetric = async (userId: string, metricId: string) => {
  console.log('[deleteIndividualMetric] Deleting individual metric:', metricId);
  
  const { error } = await supabase
    .from('user_custom_metrics_settings')
    .delete()
    .eq('id', metricId)
    .eq('user_id', userId);

  if (error) {
    console.error('[deleteIndividualMetric] Error deleting individual metric:', error);
    throw error;
  }

  console.log('[deleteIndividualMetric] Successfully deleted individual metric:', metricId);
};

export const getMetricsForSet = async (userId: string, metricSetId: string) => {
  console.log('[getMetricsForSet] Fetching metrics for set:', metricSetId);
  
  const { data, error } = await supabase
    .from('user_custom_metrics_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('metric_set_id', metricSetId);

  if (error) {
    console.error('[getMetricsForSet] Error fetching metrics:', error);
    throw error;
  }

  console.log('[getMetricsForSet] Found metrics:', data?.length || 0);
  return data || [];
};
