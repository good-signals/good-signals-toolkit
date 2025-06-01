
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { 
  UserCustomMetricSetting 
} from '@/types/targetMetrics';
import { getAccountForUser } from './accountHelpers';

const UserMetricSettingsSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  metric_identifier: z.string(),
  metric_set_id: z.string().uuid().nullable(),
  target_value: z.number().nullable(),
  higher_is_better: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export async function getUserMetricSettings(userId: string): Promise<UserCustomMetricSetting[]> {
  console.log('Getting user metric settings for user:', userId);

  const { data, error } = await supabase
    .from('user_custom_metrics_settings')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user metric settings:', error);
    throw error;
  }

  console.log('Found user metric settings:', data?.length || 0);
  return data || [];
}

export async function createUserMetricSettings(
  userId: string,
  metricSettingsData: Partial<UserCustomMetricSetting>
): Promise<UserCustomMetricSetting> {
  console.log('Creating user metric settings for user:', userId, 'with data:', metricSettingsData);

  const { data, error } = await supabase
    .from('user_custom_metrics_settings')
    .insert({
      user_id: userId,
      metric_identifier: metricSettingsData.metric_identifier!,
      metric_set_id: metricSettingsData.metric_set_id || null,
      target_value: metricSettingsData.target_value || null,
      higher_is_better: metricSettingsData.higher_is_better || true,
      category: metricSettingsData.category || '',
      label: metricSettingsData.label || '',
      account_id: metricSettingsData.account_id || '',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating user metric settings:', error);
    throw error;
  }

  console.log('Created user metric settings:', data);
  return data;
}

export async function updateUserMetricSettings(
  userId: string,
  metricId: string,
  metricSettingsData: Partial<UserCustomMetricSetting>
): Promise<UserCustomMetricSetting> {
  console.log('Updating user metric settings:', metricId, 'with data:', metricSettingsData);

  const { data, error } = await supabase
    .from('user_custom_metrics_settings')
    .update({
      ...metricSettingsData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', metricId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user metric settings:', error);
    throw error;
  }

  console.log('Updated user metric settings:', data);
  return data;
}

export async function deleteUserMetricSettings(userId: string, metricId: string): Promise<void> {
  console.log('Deleting user metric settings:', metricId);

  const { error } = await supabase
    .from('user_custom_metrics_settings')
    .delete()
    .eq('id', metricId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting user metric settings:', error);
    throw error;
  }

  console.log('Deleted user metric settings:', metricId);
}
