
import { useState, useEffect } from 'react';

export type AssessmentStep = 'idle' | 'newAddress' | 'selectMetrics' | 'inputMetrics' | 'assessmentDetails';

const SESSION_STORAGE_KEYS = {
  CURRENT_STEP: 'siteProspector_currentStep',
  ACTIVE_ASSESSMENT_ID: 'siteProspector_activeAssessmentId',
  SELECTED_METRIC_SET_ID: 'siteProspector_selectedMetricSetId',
} as const;

export const useSiteProspectorSession = () => {
  const [currentStep, setCurrentStep] = useState<AssessmentStep>(() => {
    const storedStep = sessionStorage.getItem(SESSION_STORAGE_KEYS.CURRENT_STEP);
    return (storedStep as AssessmentStep) || 'idle';
  });
  
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(() => {
    return sessionStorage.getItem(SESSION_STORAGE_KEYS.ACTIVE_ASSESSMENT_ID) || null;
  });
  
  const [selectedMetricSetId, setSelectedMetricSetId] = useState<string | null>(() => {
    return sessionStorage.getItem(SESSION_STORAGE_KEYS.SELECTED_METRIC_SET_ID) || null;
  });

  useEffect(() => {
    if (currentStep !== 'idle') {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.CURRENT_STEP, currentStep);
      if (activeAssessmentId) {
        sessionStorage.setItem(SESSION_STORAGE_KEYS.ACTIVE_ASSESSMENT_ID, activeAssessmentId);
      } else {
        sessionStorage.removeItem(SESSION_STORAGE_KEYS.ACTIVE_ASSESSMENT_ID);
      }
      if (selectedMetricSetId) {
        sessionStorage.setItem(SESSION_STORAGE_KEYS.SELECTED_METRIC_SET_ID, selectedMetricSetId);
      } else {
        sessionStorage.removeItem(SESSION_STORAGE_KEYS.SELECTED_METRIC_SET_ID);
      }
    } else {
      Object.values(SESSION_STORAGE_KEYS).forEach(key => sessionStorage.removeItem(key));
    }
  }, [currentStep, activeAssessmentId, selectedMetricSetId]);

  const clearSessionStorage = () => {
    Object.values(SESSION_STORAGE_KEYS).forEach(key => sessionStorage.removeItem(key));
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
