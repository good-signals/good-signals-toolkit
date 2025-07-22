import { supabase } from "@/integrations/supabase/client";

export interface CustomMetricSection {
  id: string;
  account_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomSectionData {
  account_id: string;
  name: string;
  sort_order?: number;
}

export interface UpdateCustomSectionData {
  name?: string;
  sort_order?: number;
}

// Get all custom sections for an account
export async function getCustomSections(accountId: string): Promise<CustomMetricSection[]> {
  const { data, error } = await supabase
    .from('custom_metric_sections')
    .select('*')
    .eq('account_id', accountId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching custom sections:', error);
    throw new Error('Failed to fetch custom sections');
  }

  return data || [];
}

// Create a new custom section
export async function createCustomSection(sectionData: CreateCustomSectionData): Promise<CustomMetricSection> {
  // Get the next sort order if not provided
  let sortOrder = sectionData.sort_order;
  if (sortOrder === undefined) {
    const { data: existingSections } = await supabase
      .from('custom_metric_sections')
      .select('sort_order')
      .eq('account_id', sectionData.account_id)
      .order('sort_order', { ascending: false })
      .limit(1);

    sortOrder = existingSections && existingSections.length > 0 
      ? existingSections[0].sort_order + 1 
      : 0;
  }

  const { data, error } = await supabase
    .from('custom_metric_sections')
    .insert({
      account_id: sectionData.account_id,
      name: sectionData.name,
      sort_order: sortOrder
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating custom section:', error);
    throw new Error('Failed to create custom section');
  }

  return data;
}

// Update a custom section
export async function updateCustomSection(
  sectionId: string, 
  updates: UpdateCustomSectionData
): Promise<CustomMetricSection> {
  const { data, error } = await supabase
    .from('custom_metric_sections')
    .update(updates)
    .eq('id', sectionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating custom section:', error);
    throw new Error('Failed to update custom section');
  }

  return data;
}

// Delete a custom section
export async function deleteCustomSection(sectionId: string): Promise<void> {
  // First check if any metrics are using this section
  const { data: metricsUsingSection } = await supabase
    .from('user_custom_metrics_settings')
    .select('id')
    .eq('category', sectionId)
    .limit(1);

  if (metricsUsingSection && metricsUsingSection.length > 0) {
    throw new Error('Cannot delete section that has metrics assigned to it');
  }

  const { error } = await supabase
    .from('custom_metric_sections')
    .delete()
    .eq('id', sectionId);

  if (error) {
    console.error('Error deleting custom section:', error);
    throw new Error('Failed to delete custom section');
  }
}

// Check if section name is unique within an account
export async function checkSectionNameUnique(accountId: string, name: string, excludeId?: string): Promise<boolean> {
  let query = supabase
    .from('custom_metric_sections')
    .select('id')
    .eq('account_id', accountId)
    .eq('name', name);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data } = await query.limit(1);
  return !data || data.length === 0;
}