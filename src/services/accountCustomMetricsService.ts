
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateImageFile } from '@/utils/fileValidation';
import { Account } from './account';

export interface CustomMetricCategory {
  id: string;
  account_id: string;
  category_name: string;
  category_description?: string | null;
  category_image_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CustomMetric {
  id: string;
  category_id: string;
  metric_identifier: string;
  name: string;
  category: string;
  description?: string | null;
  min_value?: number | null;
  max_value?: number | null;
  units?: string | null;
  higher_is_better: boolean;
  default_target_value?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface AccountCustomMetric {
  metric_identifier: string;
  name: string;
  category: string;
  description?: string | null;
  units?: string | null;
  higher_is_better: boolean;
  default_target_value?: number | null;
}

export interface CreateCustomMetricFormData {
  name: string;
  category: string;
  higher_is_better: boolean;
  units?: string;
  description?: string;
  default_target_value?: number;
}

// Placeholder functions - these would need proper database tables to work
export const fetchCustomMetricCategories = async (accountId: string): Promise<CustomMetricCategory[]> => {
  console.log('fetchCustomMetricCategories called with:', accountId);
  // Return empty array since tables don't exist yet
  return [];
};

export const getAccountCustomMetrics = async (accountId: string): Promise<AccountCustomMetric[]> => {
  console.log('getAccountCustomMetrics called with:', accountId);
  // Return empty array since tables don't exist yet
  return [];
};

export const createAccountCustomMetric = async (
  accountId: string,
  metricData: CreateCustomMetricFormData
): Promise<AccountCustomMetric | null> => {
  console.log('createAccountCustomMetric called with:', accountId, metricData);
  
  // Create a mock response for now
  const mockMetric: AccountCustomMetric = {
    metric_identifier: `custom_${Date.now()}`,
    name: metricData.name,
    category: metricData.category,
    description: metricData.description,
    units: metricData.units,
    higher_is_better: metricData.higher_is_better,
    default_target_value: metricData.default_target_value,
  };
  
  toast.info('Custom metrics feature is not yet implemented');
  return mockMetric;
};

export const addCustomMetricCategory = async (
  accountId: string,
  categoryName: string,
  categoryDescription: string | null = null,
  categoryImageUrl: string | null = null
): Promise<CustomMetricCategory | null> => {
  console.log('addCustomMetricCategory called');
  toast.info('Custom metric categories feature is not yet implemented');
  return null;
};

export const updateCustomMetricCategory = async (
  categoryId: string,
  updates: Partial<Pick<CustomMetricCategory, 'category_name' | 'category_description' | 'category_image_url'>>
): Promise<CustomMetricCategory | null> => {
  console.log('updateCustomMetricCategory called');
  toast.info('Custom metric categories feature is not yet implemented');
  return null;
};

export const deleteCustomMetricCategory = async (categoryId: string): Promise<boolean> => {
  console.log('deleteCustomMetricCategory called');
  toast.info('Custom metric categories feature is not yet implemented');
  return false;
};

export const fetchCustomMetricsByCategory = async (categoryId: string): Promise<CustomMetric[]> => {
  console.log('fetchCustomMetricsByCategory called');
  return [];
};

export const addCustomMetric = async (
  categoryId: string,
  metricName: string,
  metricDescription: string | null = null,
  minValue: number | null = null,
  maxValue: number | null = null
): Promise<CustomMetric | null> => {
  console.log('addCustomMetric called');
  toast.info('Custom metrics feature is not yet implemented');
  return null;
};

export const updateCustomMetric = async (
  metricId: string,
  updates: Partial<Pick<CustomMetric, 'name' | 'description' | 'min_value' | 'max_value'>>
): Promise<CustomMetric | null> => {
  console.log('updateCustomMetric called');
  toast.info('Custom metrics feature is not yet implemented');
  return null;
};

export const deleteCustomMetric = async (metricId: string): Promise<boolean> => {
  console.log('deleteCustomMetric called');
  toast.info('Custom metrics feature is not yet implemented');
  return false;
};
