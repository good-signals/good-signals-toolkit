
import { useState, useEffect } from 'react';
import { safeStorage } from '@/utils/safeStorage';
import { useAuth } from '@/contexts/AuthContext';

export type SiteProspectorStep = 'idle' | 'address' | 'metric-set-selection' | 'metric-input' | 'site-visit-ratings' | 'view-details';

const SESSION_STORAGE_KEYS = {
  CURRENT_STEP: 'siteProspector_currentStep',
  ACTIVE_ASSESSMENT_ID: 'siteProspector_activeAssessmentId',
  SELECTED_METRIC_SET_ID: 'siteProspector_selectedMetricSetId',
  SESSION_VERSION: 'siteProspector_sessionVersion',
  AUTH_USER_ID: 'siteProspector_authUserId',
} as const;

const CURRENT_SESSION_VERSION = '1.0.0';
const VALID_STEPS: SiteProspectorStep[] = ['idle', 'address', 'metric-set-selection', 'metric-input', 'site-visit-ratings', 'view-details'];

const isValidStep = (step: string): step is SiteProspectorStep => {
  return VALID_STEPS.includes(step as SiteProspectorStep);
};

const validateAndCleanSessionStorage = (userId: string | null, authInitialized: boolean): SiteProspectorStep => {
  try {
    // Don't validate session storage until auth is initialized
    if (!authInitialized) {
      console.log('[useSiteProspectorSession] Auth not initialized, returning idle');
      return 'idle';
    }

    // Check if user is authenticated
    if (!userId) {
      console.log('[useSiteProspectorSession] User not authenticated, clearing session');
      clearAllSessionStorage();
      return 'idle';
    }

    // Check if session user matches current user
    const storedUserId = safeStorage.sessionGetItem(SESSION_STORAGE_KEYS.AUTH_USER_ID);
    if (storedUserId && storedUserId !== userId) {
      console.log('[useSiteProspectorSession] User ID mismatch, clearing session');
      clearAllSessionStorage();
      return 'idle';
    }

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
    if ((storedStep === 'metric-input' || storedStep === 'site-visit-ratings') && (!activeAssessmentId || !selectedMetricSetId)) {
      console.log('[useSiteProspectorSession] Inconsistent state for metric input or site visit step, resetting');
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
  const { user, authLoading } = useAuth();
  const authInitialized = !authLoading;
  
  const [currentStep, setCurrentStep] = useState<SiteProspectorStep>(() => {
    return validateAndCleanSessionStorage(user?.id || null, authInitialized);
  });
  
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(() => {
    if (!authInitialized || !user) return null;
    return safeStorage.sessionGetItem(SESSION_STORAGE_KEYS.ACTIVE_ASSESSMENT_ID) || null;
  });
  
  const [selectedMetricSetId, setSelectedMetricSetId] = useState<string | null>(() => {
    if (!authInitialized || !user) return null;
    return safeStorage.sessionGetItem(SESSION_STORAGE_KEYS.SELECTED_METRIC_SET_ID) || null;
  });

  // Clear session storage when user changes or becomes unauthenticated
  useEffect(() => {
    if (authInitialized) {
      const newStep = validateAndCleanSessionStorage(user?.id || null, authInitialized);
      if (newStep !== currentStep) {
        console.log('[useSiteProspectorSession] Step changed due to auth state:', newStep);
        setCurrentStep(newStep);
        setActiveAssessmentId(null);
        setSelectedMetricSetId(null);
      }
    }
  }, [user?.id, authInitialized]);

  useEffect(() => {
    try {
      if (authInitialized && user && currentStep !== 'idle') {
        safeStorage.sessionSetItem(SESSION_STORAGE_KEYS.SESSION_VERSION, CURRENT_SESSION_VERSION);
        safeStorage.sessionSetItem(SESSION_STORAGE_KEYS.CURRENT_STEP, currentStep);
        safeStorage.sessionSetItem(SESSION_STORAGE_KEYS.AUTH_USER_ID, user.id);
        
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
      } else if (authInitialized && (!user || currentStep === 'idle')) {
        clearAllSessionStorage();
      }
    } catch (error) {
      console.error('[useSiteProspectorSession] Error saving to session storage:', error);
    }
  }, [currentStep, activeAssessmentId, selectedMetricSetId, user?.id, authInitialized]);

  const clearSessionStorage = () => {
    clearAllSessionStorage();
  };

  const safeSetCurrentStep = (step: SiteProspectorStep) => {
    if (!authInitialized) {
      console.log('[useSiteProspectorSession] Cannot set step while auth is loading');
      return;
    }
    
    if (!user && step !== 'idle') {
      console.log('[useSiteProspectorSession] Cannot set step without authentication');
      setCurrentStep('idle');
      return;
    }
    
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
    authInitialized,
  };
};
