
import { useState, useEffect } from 'react';
import { safeStorage } from '@/utils/safeStorage';

export type SiteProspectorStep = 'idle' | 'address' | 'metric-set-selection' | 'metric-input' | 'view-details';

const SESSION_STORAGE_KEYS = {
  CURRENT_STEP: 'siteProspector_currentStep',
  ACTIVE_ASSESSMENT_ID: 'siteProspector_activeAssessmentId',
  SELECTED_METRIC_SET_ID: 'siteProspector_selectedMetricSetId',
  SESSION_VERSION: 'siteProspector_sessionVersion',
} as const;

const CURRENT_SESSION_VERSION = '1.0.0';
const VALID_STEPS: SiteProspectorStep[] = ['idle', 'address', 'metric-set-selection', 'metric-input', 'view-details'];

const isValidStep = (step: string): step is SiteProspectorStep => {
  return VALID_STEPS.includes(step as SiteProspectorStep);
};

const validateAndCleanSessionStorage = (): SiteProspectorStep => {
  try {
    // Check session version for compatibility
    const sessionVersion = safeStorage.sessionGetItem(SESSION_STORAGE_KEYS.SESSION_VERSION);
    if (sessionVersion !== CURRENT_SESSION_VERSION) {
      console.log('[useSiteProspectorSession] Session version mismatch, clearing storage');
      clearAllSessionStorage();
      return 'idle';
    }

    const storedStep = safeStorage.sessionGetItem(SESSION_STORAGE_KEYS.CURRENT_STEP);
    
    if (!storedStep || !isValidStep(storedStep)) {
      console.log('[useSiteProspectorSession] Invalid step found in storage:', storedStep, 'clearing session');
      clearAllSessionStorage();
      return 'idle';
    }

    // Validate step consistency
    const activeAssessmentId = safeStorage.sessionGetItem(SESSION_STORAGE_KEYS.ACTIVE_ASSESSMENT_ID);
    const selectedMetricSetId = safeStorage.sessionGetItem(SESSION_STORAGE_KEYS.SELECTED_METRIC_SET_ID);

    // Check for invalid state combinations
    if (storedStep === 'metric-input' && (!activeAssessmentId || !selectedMetricSetId)) {
      console.log('[useSiteProspectorSession] Inconsistent state for metric-input step, resetting');
      clearAllSessionStorage();
      return 'idle';
    }

    if (storedStep === 'view-details' && !activeAssessmentId) {
      console.log('[useSiteProspectorSession] Inconsistent state for view-details step, resetting');
      clearAllSessionStorage();
      return 'idle';
    }

    return storedStep;
  } catch (error) {
    console.error('[useSiteProspectorSession] Error validating session storage:', error);
    clearAllSessionStorage();
    return 'idle';
  }
};

const clearAllSessionStorage = () => {
  Object.values(SESSION_STORAGE_KEYS).forEach(key => safeStorage.sessionRemoveItem(key));
};

export const useSiteProspectorSession = () => {
  const [currentStep, setCurrentStep] = useState<SiteProspectorStep>(() => {
    return validateAndCleanSessionStorage();
  });
  
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(() => {
    if (currentStep === 'idle') return null;
    return safeStorage.sessionGetItem(SESSION_STORAGE_KEYS.ACTIVE_ASSESSMENT_ID) || null;
  });
  
  const [selectedMetricSetId, setSelectedMetricSetId] = useState<string | null>(() => {
    if (currentStep === 'idle') return null;
    return safeStorage.sessionGetItem(SESSION_STORAGE_KEYS.SELECTED_METRIC_SET_ID) || null;
  });

  useEffect(() => {
    try {
      if (currentStep !== 'idle') {
        safeStorage.sessionSetItem(SESSION_STORAGE_KEYS.SESSION_VERSION, CURRENT_SESSION_VERSION);
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
        clearAllSessionStorage();
      }
    } catch (error) {
      console.error('[useSiteProspectorSession] Error saving to session storage:', error);
    }
  }, [currentStep, activeAssessmentId, selectedMetricSetId]);

  const clearSessionStorage = () => {
    clearAllSessionStorage();
  };

  const safeSetCurrentStep = (step: SiteProspectorStep) => {
    if (isValidStep(step)) {
      setCurrentStep(step);
    } else {
      console.error('[useSiteProspectorSession] Attempt to set invalid step:', step);
      setCurrentStep('idle');
    }
  };

  return {
    currentStep,
    setCurrentStep: safeSetCurrentStep,
    activeAssessmentId,
    setActiveAssessmentId,
    selectedMetricSetId,
    setSelectedMetricSetId,
    clearSessionStorage,
  };
};
