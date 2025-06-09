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
  metric_name: string;
  metric_description?: string | null;
  min_value?: number | null;
  max_value?: number | null;
  created_at?: string;
  updated_at?: string;
}

// Custom Metric Category Services
export const fetchCustomMetricCategories = async (accountId: string): Promise<CustomMetricCategory[]> => {
  try {
    const { data, error } = await supabase
      .from('custom_metric_categories')
      .select('*')
      .eq('account_id', accountId);

    if (error) {
      console.error('Error fetching custom metric categories:', error);
      toast.error('Failed to fetch custom metric categories.');
      return [];
    }

    return data || [];
  } catch (error: any) {
    console.error('Unexpected error fetching custom metric categories:', error);
    toast.error('An unexpected error occurred while fetching custom metric categories.');
    return [];
  }
};

export const addCustomMetricCategory = async (
  accountId: string,
  categoryName: string,
  categoryDescription: string | null = null,
  categoryImageUrl: string | null = null
): Promise<CustomMetricCategory | null> => {
  try {
    const { data, error } = await supabase
      .from('custom_metric_categories')
      .insert([
        {
          account_id: accountId,
          category_name: categoryName,
          category_description: categoryDescription,
          category_image_url: categoryImageUrl,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error adding custom metric category:', error);
      toast.error('Failed to add custom metric category.');
      return null;
    }

    toast.success('Custom metric category added successfully!');
    return data;
  } catch (error: any) {
    console.error('Unexpected error adding custom metric category:', error);
    toast.error('An unexpected error occurred while adding custom metric category.');
    return null;
  }
};

export const updateCustomMetricCategory = async (
  categoryId: string,
  updates: Partial<Pick<CustomMetricCategory, 'category_name' | 'category_description' | 'category_image_url'>>
): Promise<CustomMetricCategory | null> => {
  try {
    const { data, error } = await supabase
      .from('custom_metric_categories')
      .update(updates)
      .eq('id', categoryId)
      .select()
      .single();

    if (error) {
      console.error('Error updating custom metric category:', error);
      toast.error('Failed to update custom metric category.');
      return null;
    }

    toast.success('Custom metric category updated successfully!');
    return data;
  } catch (error: any) {
    console.error('Unexpected error updating custom metric category:', error);
    toast.error('An unexpected error occurred while updating custom metric category.');
    return null;
  }
};

export const deleteCustomMetricCategory = async (categoryId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('custom_metric_categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      console.error('Error deleting custom metric category:', error);
      toast.error('Failed to delete custom metric category.');
      return false;
    }

    toast.success('Custom metric category deleted successfully!');
    return true;
  } catch (error: any) {
    console.error('Unexpected error deleting custom metric category:', error);
    toast.error('An unexpected error occurred while deleting custom metric category.');
    return false;
  }
};

// Custom Metric Services
export const fetchCustomMetricsByCategory = async (categoryId: string): Promise<CustomMetric[]> => {
  try {
    const { data, error } = await supabase
      .from('custom_metrics')
      .select('*')
      .eq('category_id', categoryId);

    if (error) {
      console.error('Error fetching custom metrics by category:', error);
      toast.error('Failed to fetch custom metrics.');
      return [];
    }

    return data || [];
  } catch (error: any) {
    console.error('Unexpected error fetching custom metrics:', error);
    toast.error('An unexpected error occurred while fetching custom metrics.');
    return [];
  }
};

export const addCustomMetric = async (
  categoryId: string,
  metricName: string,
  metricDescription: string | null = null,
  minValue: number | null = null,
  maxValue: number | null = null
): Promise<CustomMetric | null> => {
  try {
    const { data, error } = await supabase
      .from('custom_metrics')
      .insert([
        {
          category_id: categoryId,
          metric_name: metricName,
          metric_description: metricDescription,
          min_value: minValue,
          max_value: maxValue,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error adding custom metric:', error);
      toast.error('Failed to add custom metric.');
      return null;
    }

    toast.success('Custom metric added successfully!');
    return data;
  } catch (error: any) {
    console.error('Unexpected error adding custom metric:', error);
    toast.error('An unexpected error occurred while adding custom metric.');
    return null;
  }
};

export const updateCustomMetric = async (
  metricId: string,
  updates: Partial<Pick<CustomMetric, 'metric_name' | 'metric_description' | 'min_value' | 'max_value'>>
): Promise<CustomMetric | null> => {
  try {
    const { data, error } = await supabase
      .from('custom_metrics')
      .update(updates)
      .eq('id', metricId)
      .select()
      .single();

    if (error) {
      console.error('Error updating custom metric:', error);
      toast.error('Failed to update custom metric.');
      return null;
    }

    toast.success('Custom metric updated successfully!');
    return data;
  } catch (error: any) {
    console.error('Unexpected error updating custom metric:', error);
    toast.error('An unexpected error occurred while updating custom metric.');
    return null;
  }
};

export const deleteCustomMetric = async (metricId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('custom_metrics')
      .delete()
      .eq('id', metricId);

    if (error) {
      console.error('Error deleting custom metric:', error);
      toast.error('Failed to delete custom metric.');
      return false;
    }

    toast.success('Custom metric deleted successfully!');
    return true;
  } catch (error: any) {
    console.error('Unexpected error deleting custom metric:', error);
    toast.error('An unexpected error occurred while deleting custom metric.');
    return false;
  }
};
