
import { useState, useEffect } from 'react';
import { TerritoryAnalysis, CBSAData } from '@/types/territoryTargeterTypes';
import { safeStorage } from '@/utils/safeStorage';

const STORAGE_KEY = 'territoryTargeter_currentAnalysis';
const CBSA_DATA_KEY = 'territoryTargeter_cbsaData';
const ANALYSIS_STATE_KEY = 'territoryTargeter_analysisState';

interface AnalysisState {
  id: string;
  prompt: string;
  cbsaData: any[];
  startTime: number;
  status: 'running' | 'completed' | 'failed';
}

export const useAnalysisState = () => {
  const [currentAnalysis, setCurrentAnalysisState] = useState<TerritoryAnalysis | null>(() => {
    // Safely load saved analysis from localStorage with corruption check
    const saved = safeStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = safeStorage.safeParse(saved, null);
        if (parsed && parsed.id && parsed.criteriaColumns) {
          console.log('Loaded saved analysis from localStorage:', parsed.id);
          return {
            ...parsed,
            createdAt: new Date(parsed.createdAt),
            criteriaColumns: parsed.criteriaColumns?.map((col: any) => ({
              ...col,
              createdAt: new Date(col.createdAt)
            })) || []
          };
        } else {
          console.log('Corrupted analysis data found, clearing...');
          safeStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        console.error('Failed to load saved analysis:', error);
        safeStorage.removeItem(STORAGE_KEY);
      }
    }
    return null;
  });

  const [storedCBSAData, setStoredCBSAData] = useState<CBSAData[]>(() => {
    // Load CBSA data from localStorage with validation
    const saved = safeStorage.getItem(CBSA_DATA_KEY);
    if (saved) {
      try {
        const parsed = safeStorage.safeParse(saved, []);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log('Loaded saved CBSA data from localStorage:', parsed.length, 'items');
          return parsed;
        }
      } catch (error) {
        console.error('Failed to load saved CBSA data:', error);
        safeStorage.removeItem(CBSA_DATA_KEY);
      }
    }
    return [];
  });

  // Enhanced setCurrentAnalysis function with validation
  const setCurrentAnalysis = (analysis: TerritoryAnalysis | null) => {
    console.log('Setting current analysis:', analysis?.id);
    
    // Validate analysis structure before setting
    if (analysis && (!analysis.id || !Array.isArray(analysis.criteriaColumns))) {
      console.error('Invalid analysis structure provided:', analysis);
      return;
    }
    
    setCurrentAnalysisState(analysis);
  };

  // Save analysis to localStorage with validation
  useEffect(() => {
    if (currentAnalysis && currentAnalysis.id && Array.isArray(currentAnalysis.criteriaColumns)) {
      console.log('Saving analysis to localStorage:', currentAnalysis.id, 'with', currentAnalysis.criteriaColumns.length, 'columns');
      try {
        safeStorage.setItem(STORAGE_KEY, JSON.stringify(currentAnalysis));
      } catch (error) {
        console.error('Failed to save analysis to localStorage:', error);
      }
    } else if (currentAnalysis === null) {
      console.log('Removing analysis from localStorage');
      safeStorage.removeItem(STORAGE_KEY);
    }
  }, [currentAnalysis]);

  // Save CBSA data to localStorage with validation
  useEffect(() => {
    if (Array.isArray(storedCBSAData) && storedCBSAData.length > 0) {
      console.log('Saving CBSA data to localStorage:', storedCBSAData.length, 'items');
      try {
        safeStorage.setItem(CBSA_DATA_KEY, JSON.stringify(storedCBSAData));
      } catch (error) {
        console.error('Failed to save CBSA data to localStorage:', error);
      }
    } else if (storedCBSAData.length === 0) {
      const saved = safeStorage.getItem(CBSA_DATA_KEY);
      if (saved) {
        console.log('Clearing empty CBSA data from localStorage');
        safeStorage.removeItem(CBSA_DATA_KEY);
      }
    }
  }, [storedCBSAData]);

  const saveAnalysisState = (state: AnalysisState) => {
    console.log('Saving analysis state:', state.id);
    try {
      safeStorage.setItem(ANALYSIS_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save analysis state:', error);
    }
  };

  const getAnalysisState = (): AnalysisState | null => {
    const saved = safeStorage.getItem(ANALYSIS_STATE_KEY);
    if (!saved) return null;
    
    try {
      const parsed = safeStorage.safeParse(saved, null);
      // Validate the parsed state structure
      if (parsed && parsed.id && parsed.status && typeof parsed.startTime === 'number') {
        return parsed;
      } else {
        console.log('Invalid analysis state structure, clearing...');
        safeStorage.removeItem(ANALYSIS_STATE_KEY);
        return null;
      }
    } catch (error) {
      console.error('Failed to parse analysis state:', error);
      safeStorage.removeItem(ANALYSIS_STATE_KEY);
      return null;
    }
  };

  const clearAnalysisState = () => {
    console.log('Clearing analysis state');
    safeStorage.removeItem(ANALYSIS_STATE_KEY);
  };

  const clearAnalysis = () => {
    console.log('Clearing all analysis data');
    setCurrentAnalysis(null);
    setStoredCBSAData([]);
    safeStorage.removeItem(STORAGE_KEY);
    safeStorage.removeItem(CBSA_DATA_KEY);
    safeStorage.removeItem(ANALYSIS_STATE_KEY);
  };

  const setCBSAData = (data: CBSAData[]) => {
    if (!Array.isArray(data)) {
      console.error('Invalid CBSA data provided:', data);
      return;
    }
    console.log('Setting CBSA data:', data.length, 'items');
    setStoredCBSAData(data);
  };

  // Clean up corrupted states on mount
  useEffect(() => {
    const cleanupCorruptedStates = () => {
      try {
        // Check for corrupted analysis state
        const analysisState = getAnalysisState();
        if (analysisState && analysisState.status === 'running') {
          const elapsed = Date.now() - analysisState.startTime;
          // Clear states that have been running for more than 15 minutes
          if (elapsed > 15 * 60 * 1000) {
            console.log('Cleaning up stale running analysis state');
            clearAnalysisState();
          }
        }
        
        // Validate stored analysis structure
        const storedAnalysis = safeStorage.getItem(STORAGE_KEY);
        if (storedAnalysis) {
          const parsed = safeStorage.safeParse(storedAnalysis, null);
          if (!parsed || !parsed.id || !Array.isArray(parsed.criteriaColumns)) {
            console.log('Cleaning up corrupted analysis data');
            safeStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error('Error during state cleanup:', error);
      }
    };

    cleanupCorruptedStates();
  }, []);

  return {
    currentAnalysis,
    setCurrentAnalysis,
    storedCBSAData,
    setCBSAData,
    saveAnalysisState,
    getAnalysisState,
    clearAnalysisState,
    clearAnalysis
  };
};
