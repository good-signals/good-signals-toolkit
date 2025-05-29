
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
    // Safely load saved analysis from localStorage
    const saved = safeStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = safeStorage.safeParse(saved, null);
        if (parsed) {
          console.log('Loaded saved analysis from localStorage:', parsed.id);
          return {
            ...parsed,
            createdAt: new Date(parsed.createdAt),
            criteriaColumns: parsed.criteriaColumns?.map((col: any) => ({
              ...col,
              createdAt: new Date(col.createdAt)
            })) || []
          };
        }
      } catch (error) {
        console.error('Failed to load saved analysis:', error);
        safeStorage.removeItem(STORAGE_KEY);
      }
    }
    return null;
  });

  const [storedCBSAData, setStoredCBSAData] = useState<CBSAData[]>(() => {
    // Load CBSA data from localStorage
    const saved = safeStorage.getItem(CBSA_DATA_KEY);
    if (saved) {
      try {
        const parsed = safeStorage.safeParse(saved, []);
        console.log('Loaded saved CBSA data from localStorage:', parsed.length, 'items');
        return parsed;
      } catch (error) {
        console.error('Failed to load saved CBSA data:', error);
        safeStorage.removeItem(CBSA_DATA_KEY);
      }
    }
    return [];
  });

  // Enhanced setCurrentAnalysis function that ensures proper updates
  const setCurrentAnalysis = (analysis: TerritoryAnalysis | null) => {
    console.log('Setting current analysis:', analysis?.id);
    setCurrentAnalysisState(analysis);
    
    // Force a small delay to ensure state updates are processed
    setTimeout(() => {
      console.log('Analysis state updated successfully');
    }, 0);
  };

  // Save analysis to localStorage whenever it changes
  useEffect(() => {
    if (currentAnalysis) {
      console.log('Saving analysis to localStorage:', currentAnalysis.id, 'with', currentAnalysis.criteriaColumns.length, 'columns');
      safeStorage.setItem(STORAGE_KEY, JSON.stringify(currentAnalysis));
    } else {
      console.log('Removing analysis from localStorage');
      safeStorage.removeItem(STORAGE_KEY);
    }
  }, [currentAnalysis]);

  // Save CBSA data to localStorage whenever it changes
  useEffect(() => {
    if (storedCBSAData.length > 0) {
      console.log('Saving CBSA data to localStorage:', storedCBSAData.length, 'items');
      safeStorage.setItem(CBSA_DATA_KEY, JSON.stringify(storedCBSAData));
    } else {
      safeStorage.removeItem(CBSA_DATA_KEY);
    }
  }, [storedCBSAData]);

  const saveAnalysisState = (state: AnalysisState) => {
    safeStorage.setItem(ANALYSIS_STATE_KEY, JSON.stringify(state));
  };

  const getAnalysisState = (): AnalysisState | null => {
    const saved = safeStorage.getItem(ANALYSIS_STATE_KEY);
    return saved ? safeStorage.safeParse(saved, null) : null;
  };

  const clearAnalysisState = () => {
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
    setStoredCBSAData(data);
  };

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
