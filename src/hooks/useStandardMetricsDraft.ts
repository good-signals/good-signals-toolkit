
import { useCallback, useEffect, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { StandardMetricsFormData } from '@/types/standardMetrics';
import { safeStorage } from '@/utils/safeStorage';

const DRAFT_KEY = 'standard-metrics-draft';

export const useStandardMetricsDraft = (
  form: UseFormReturn<StandardMetricsFormData>,
  metricSetId?: string
) => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Load draft data
  const loadDraft = useCallback((): StandardMetricsFormData | null => {
    if (metricSetId) {
      console.log('Not loading draft - editing existing metric set:', metricSetId);
      return null;
    }
    
    const draftData = safeStorage.getItem(DRAFT_KEY);
    const parsed = safeStorage.safeParse(draftData, null);
    console.log('Loading draft data:', parsed);
    return parsed;
  }, [metricSetId]);

  // Save draft data (immediate)
  const saveDraft = useCallback((data: StandardMetricsFormData) => {
    if (metricSetId) {
      console.log('Not saving draft - editing existing metric set:', metricSetId);
      return;
    }
    
    const draftData = {
      ...data,
      metric_set_id: undefined,
    };
    
    safeStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    console.log('Draft saved immediately:', draftData);
  }, [metricSetId]);

  // Clear draft data
  const clearDraft = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    safeStorage.removeItem(DRAFT_KEY);
    console.log('Draft cleared from localStorage');
  }, []);

  // Check if draft exists
  const hasDraft = useCallback((): boolean => {
    if (metricSetId) return false;
    const draftData = safeStorage.getItem(DRAFT_KEY);
    const exists = draftData !== null;
    console.log('Draft exists:', exists);
    return exists;
  }, [metricSetId]);

  // Watch form changes and auto-save immediately
  useEffect(() => {
    if (metricSetId) {
      console.log('Skipping auto-save - editing existing metric set');
      return;
    }

    const subscription = form.watch((data) => {
      console.log('Form data changed, saving immediately:', data);
      saveDraft(data as StandardMetricsFormData);
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
