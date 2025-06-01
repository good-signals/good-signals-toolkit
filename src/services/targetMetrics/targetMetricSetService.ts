
import { supabase } from '@/integrations/supabase/client';
import { TargetMetricSet, CreateTargetMetricSetData } from '@/types/targetMetrics';

export const getTargetMetricSetById = async (id: string, userId: string): Promise<TargetMetricSet | null> => {
  const { data, error } = await supabase
    .from('target_metric_sets')
    .select(`
      *,
      user_custom_metrics_settings (*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching target metric set:', error);
    return null;
  }

  // Ensure the data conforms to our expected type structure
  if (data) {
    return {
      id: data.id,
      account_id: data.account_id,
      name: data.name,
      created_at: data.created_at,
      updated_at: data.updated_at,
      user_custom_metrics_settings: data.user_custom_metrics_settings || []
    };
  }

  return null;
};

export const deleteTargetMetricSet = async (id: string, userId: string) => {
  const { error } = await supabase
    .from('target_metric_sets')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting target metric set:', error);
    throw error;
  }
};

export const createTargetMetricSet = async (data: CreateTargetMetricSetData, userId: string, accountId: string) => {
  const { data: result, error } = await supabase
    .from('target_metric_sets')
    .insert({
      name: data.name,
      account_id: accountId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating target metric set:', error);
    throw error;
  }

  return result;
};
