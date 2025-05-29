
import { useState, useEffect } from 'react';
import { TerritoryAnalysis } from '@/types/territoryTargeterTypes';
import { safeStorage } from '@/utils/safeStorage';

const STORAGE_KEY = 'territoryTargeter_currentAnalysis';
const ANALYSIS_STATE_KEY = 'territoryTargeter_analysisState';

interface AnalysisState {
  id: string;
  prompt: string;
  cbsaData: any[];
  startTime: number;
  status: 'running' | 'completed' | 'failed';
}

export const useAnalysisState = () => {
  const [currentAnalysis, setCurrentAnalysis] = useState<TerritoryAnalysis | null>(() => {
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

  // Save analysis to localStorage whenever it changes
  useEffect(() => {
    if (currentAnalysis) {
      console.log('Saving analysis to localStorage:', currentAnalysis.id);
      safeStorage.setItem(STORAGE_KEY, JSON.stringify(currentAnalysis));
    } else {
      safeStorage.removeItem(STORAGE_KEY);
    }
  }, [currentAnalysis]);

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
    setCurrentAnalysis(null);
    safeStorage.removeItem(STORAGE_KEY);
    safeStorage.removeItem(ANALYSIS_STATE_KEY);
  };

  return {
    currentAnalysis,
    setCurrentAnalysis,
    saveAnalysisState,
    getAnalysisState,
    clearAnalysisState,
    clearAnalysis
  };
};
