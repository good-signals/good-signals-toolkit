
import { useState, useEffect } from 'react';
import { safeStorage } from '@/utils/safeStorage';

export type SiteProspectorStep = 'idle' | 'address' | 'metric-set-selection' | 'metric-input' | 'view-details';

const SESSION_STORAGE_KEYS = {
  CURRENT_STEP: 'siteProspector_currentStep',
  ACTIVE_ASSESSMENT_ID: 'siteProspector_activeAssessmentId',
  SELECTED_METRIC_SET_ID: 'siteProspector_selectedMetricSetId',
} as const;

export const useSiteProspectorSession = () => {
  const [currentStep, setCurrentStep] = useState<SiteProspectorStep>(() => {
    const storedStep = safeStorage.sessionGetItem(SESSION_STORAGE_KEYS.CURRENT_STEP);
    return (storedStep as SiteProspectorStep) || 'idle';
  });
  
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(() => {
    return safeStorage.sessionGetItem(SESSION_STORAGE_KEYS.ACTIVE_ASSESSMENT_ID) || null;
  });
  
  const [selectedMetricSetId, setSelectedMetricSetId] = useState<string | null>(() => {
    return safeStorage.sessionGetItem(SESSION_STORAGE_KEYS.SELECTED_METRIC_SET_ID) || null;
  });

  useEffect(() => {
    if (currentStep !== 'idle') {
      safeStorage.sessionSetItem(SESSION_STORAGE_KEYS.CURRENT_STEP, currentStep);
      if (activeAssessmentId) {
        safeStorage.sessionSetItem(SESSION_STORAGE_KEYS.ACTIVE_ASSESSMENT_ID, activeAssessmentId);
      } else {
        safeStorage.sessionRemoveItem(SESSION_STORAGE_KEYS.ACTIVE_ASSESSMENT_ID);
      }
      if (selectedMetricSetId) {
        safeStorage.sessionSetItem(SESSION_STORAGE_KEYS.SELECTED_METRIC_SET_ID, selectedMetricSetId);
      } else {
        safeStorage.sessionRemoveItem(SESSION_STORAGE_KEYS.SELECTED_METRIC_SET_ID);
      }
    } else {
      Object.values(SESSION_STORAGE_KEYS).forEach(key => safeStorage.sessionRemoveItem(key));
    }
  }, [currentStep, activeAssessmentId, selectedMetricSetId]);

  const clearSessionStorage = () => {
    Object.values(SESSION_STORAGE_KEYS).forEach(key => safeStorage.sessionRemoveItem(key));
  };

  return {
    currentStep,
    setCurrentStep,
    activeAssessmentId,
    setActiveAssessmentId,
    selectedMetricSetId,
    setSelectedMetricSetId,
    clearSessionStorage,
  };
};
