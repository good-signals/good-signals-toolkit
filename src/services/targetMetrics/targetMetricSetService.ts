import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { TargetMetricSet } from '@/types/targetMetrics';
import { getAccountForUser } from './accountHelpers';

// Zod schema for TargetMetricSet
export const TargetMetricSetSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Zod schema for creating a TargetMetricSet
export const CreateTargetMetricSetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export type CreateTargetMetricSetData = z.infer<typeof CreateTargetMetricSetSchema>;

// Function to fetch all target metric sets for a given user
export async function getTargetMetricSets(userId: string): Promise<TargetMetricSet[]> {
  console.log('Getting target metric sets for user:', userId);

  const account = await getAccountForUser(userId);

  if (!account) {
    console.log('No account found for user, returning empty array');
    return [];
  }

  const { data, error } = await supabase
    .from('target_metric_sets')
    .select('*')
    .eq('account_id', account.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching target metric sets:', error);
    throw error;
  }

  console.log('Found target metric sets:', data?.length || 0);
  return z.array(TargetMetricSetSchema).parse(data || []);
}

// Function to fetch a single target metric set by ID
export async function getTargetMetricSetById(metricSetId: string): Promise<TargetMetricSet | null> {
  console.log('Getting target metric set by ID:', metricSetId);

  const { data, error } = await supabase
    .from('target_metric_sets')
    .select('*')
    .eq('id', metricSetId)
    .single();

  if (error) {
    console.error('Error fetching target metric set:', error);
    throw error;
  }

  if (!data) {
    console.log('Target metric set not found');
    return null;
  }

  return TargetMetricSetSchema.parse(data);
}

// Function to create a new target metric set
export async function createTargetMetricSet(userId: string, data: CreateTargetMetricSetData): Promise<TargetMetricSet> {
  console.log('Creating target metric set for user:', userId, 'with data:', data);

  const account = await getAccountForUser(userId);

  if (!account) {
    throw new Error('User must be part of an account to create target metric sets');
  }

  const { data: newMetricSet, error } = await supabase
    .from('target_metric_sets')
    .insert({
      account_id: account.id,
      name: data.name,
      description: data.description,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating target metric set:', error);
    throw error;
  }

  console.log('Created target metric set:', newMetricSet);
  return TargetMetricSetSchema.parse(newMetricSet);
}

// Function to update an existing target metric set
export async function updateTargetMetricSet(metricSetId: string, data: Partial<CreateTargetMetricSetData>): Promise<TargetMetricSet> {
  console.log('Updating target metric set:', metricSetId, 'with data:', data);

  const { data: updatedMetricSet, error } = await supabase
    .from('target_metric_sets')
    .update(data)
    .eq('id', metricSetId)
    .select()
    .single();

  if (error) {
    console.error('Error updating target metric set:', error);
    throw error;
  }

  console.log('Updated target metric set:', updatedMetricSet);
  return TargetMetricSetSchema.parse(updatedMetricSet);
}

// Function to delete a target metric set
export async function deleteTargetMetricSet(metricSetId: string): Promise<void> {
  console.log('Deleting target metric set:', metricSetId);

  const { error } = await supabase
    .from('target_metric_sets')
    .delete()
    .eq('id', metricSetId);

  if (error) {
    console.error('Error deleting target metric set:', error);
    throw error;
  }

  console.log('Deleted target metric set:', metricSetId);
}
