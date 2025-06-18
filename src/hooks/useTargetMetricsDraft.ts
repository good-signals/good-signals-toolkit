
import { useCallback, useEffect, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { TargetMetricsFormData } from '@/types/targetMetrics';
import { safeStorage } from '@/utils/safeStorage';

const DRAFT_KEY = 'target-metrics-draft';
const AUTOSAVE_DELAY = 1000; // 1 second debounce

export const useTargetMetricsDraft = (
  form: UseFormReturn<TargetMetricsFormData> | null,
  metricSetId?: string
) => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Load draft data
  const loadDraft = useCallback((): TargetMetricsFormData | null => {
    if (metricSetId) return null; // Don't load draft for existing metric sets
    
    const draftData = safeStorage.getItem(DRAFT_KEY);
    return safeStorage.safeParse(draftData, null);
  }, [metricSetId]);

  // Save draft data (debounced)
  const saveDraft = useCallback((data: TargetMetricsFormData) => {
    if (metricSetId) return; // Don't save draft for existing metric sets
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      const draftData = {
        ...data,
        // Ensure we don't save the metric_set_id for drafts
        metric_set_id: undefined,
      };
      safeStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
      console.log('Target metrics draft saved to localStorage');
    }, AUTOSAVE_DELAY);
  }, [metricSetId]);

  // Clear draft data
  const clearDraft = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    safeStorage.removeItem(DRAFT_KEY);
    console.log('Target metrics draft cleared from localStorage');
  }, []);

  // Check if draft exists
  const hasDraft = useCallback((): boolean => {
    if (metricSetId) return false;
    const draftData = safeStorage.getItem(DRAFT_KEY);
    return draftData !== null;
  }, [metricSetId]);

  // Watch form changes and auto-save - only if form is not null
  useEffect(() => {
    if (!form || metricSetId) return; // Don't auto-save if form is null or for existing metric sets

    const subscription = form.watch((data) => {
      // Only save if there's meaningful content (including custom metrics)
      if (data.metric_set_name && data.metric_set_name.trim() !== '' || 
          (data.custom_metrics && data.custom_metrics.length > 0) ||
          (data.visitor_profile_metrics && data.visitor_profile_metrics.length > 0) ||
          (data.predefined_metrics && data.predefined_metrics.length > 0)) {
        saveDraft(data as TargetMetricsFormData);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [form, metricSetId, saveDraft]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    loadDraft,
    saveDraft,
    clearDraft,
    hasDraft,
  };
};
