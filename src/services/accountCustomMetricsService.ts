
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { getSuperAdminAwareAccountId, Account } from './accountService';

// Schema for account custom metric
export const AccountCustomMetricSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  metric_identifier: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  category: z.string().min(1),
  units: z.string().nullable(),
  default_target_value: z.number().nullable(),
  higher_is_better: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AccountCustomMetric = z.infer<typeof AccountCustomMetricSchema>;

// Schema for creating/updating custom metrics
export const CreateAccountCustomMetricSchema = z.object({
  name: z.string().min(1, "Metric name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  units: z.string().optional(),
  default_target_value: z.number().nullable().optional(),
  higher_is_better: z.boolean(),
});
export type CreateAccountCustomMetricData = z.infer<typeof CreateAccountCustomMetricSchema>;

export async function getAccountCustomMetrics(userId: string, activeAccount?: Account | null): Promise<AccountCustomMetric[]> {
  console.log('Getting account custom metrics for user:', userId);
  
  const accountId = await getSuperAdminAwareAccountId(userId, activeAccount);
  if (!accountId) {
    console.log('No account ID found for user, returning empty array');
    return [];
  }

  const { data, error } = await supabase
    .from('account_custom_metrics')
    .select('*')
    .eq('account_id', accountId)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching account custom metrics:', error);
    throw error;
  }
  
  console.log('Found custom metrics:', data?.length || 0);
  return z.array(AccountCustomMetricSchema).parse(data || []);
}

export async function createAccountCustomMetric(
  userId: string, 
  metricData: CreateAccountCustomMetricData,
  activeAccount?: Account | null
): Promise<AccountCustomMetric> {
  console.log('Creating account custom metric for user:', userId, 'with data:', metricData);
  
  const accountId = await getSuperAdminAwareAccountId(userId, activeAccount);
  if (!accountId) {
    throw new Error('User must be an account admin to create custom metrics');
  }

  // Generate a unique metric identifier
  const metric_identifier = `custom_${metricData.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;

  const { data, error } = await supabase
    .from('account_custom_metrics')
    .insert({
      account_id: accountId,
      metric_identifier,
      name: metricData.name,
      description: metricData.description || null,
      category: metricData.category,
      units: metricData.units || null,
      default_target_value: metricData.default_target_value || null,
      higher_is_better: metricData.higher_is_better,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating account custom metric:', error);
    throw error;
  }
  
  console.log('Created custom metric:', data);
  return AccountCustomMetricSchema.parse(data);
}

export async function updateAccountCustomMetric(
  userId: string,
  metricId: string,
  metricData: Partial<CreateAccountCustomMetricData>,
  activeAccount?: Account | null
): Promise<AccountCustomMetric> {
  console.log('Updating account custom metric:', metricId, 'with data:', metricData);
  
  const accountId = await getSuperAdminAwareAccountId(userId, activeAccount);
  if (!accountId) {
    throw new Error('User must be an account admin to update custom metrics');
  }

  const { data, error } = await supabase
    .from('account_custom_metrics')
    .update({
      ...metricData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', metricId)
    .eq('account_id', accountId)
    .select()
    .single();

  if (error) {
    console.error('Error updating account custom metric:', error);
    throw error;
  }
  
  console.log('Updated custom metric:', data);
  return AccountCustomMetricSchema.parse(data);
}

export async function deleteAccountCustomMetric(userId: string, metricId: string, activeAccount?: Account | null): Promise<void> {
  console.log('Deleting account custom metric:', metricId);
  
  const accountId = await getSuperAdminAwareAccountId(userId, activeAccount);
  if (!accountId) {
    throw new Error('User must be an account admin to delete custom metrics');
  }

  const { error } = await supabase
    .from('account_custom_metrics')
    .delete()
    .eq('id', metricId)
    .eq('account_id', accountId);

  if (error) {
    console.error('Error deleting account custom metric:', error);
    throw error;
  }
  
  console.log('Deleted custom metric:', metricId);
}
