export interface CBSAData {
  name: string;
  population?: number;
  medianIncome?: number;
  unemploymentRate?: number;
  score?: number; // Added missing score property
  // Add other properties as needed
}

export interface CriteriaColumn {
  id: string;
  title: string;
  prompt: string;
  analysisMode: 'fast' | 'detailed';
  scores: { market: string; score: number | null; reasoning?: string }[];
  isIncludedInSignalScore: boolean;
  isManuallyOverridden: { [market: string]: boolean };
  logicSummary?: string;
}

export interface TerritoryAnalysis {
  id: string;
  name: string;
  criteriaColumns: CriteriaColumn[];
  includedColumns: string[];
}

export interface ManualScoreOverride {
  columnId: string;
  marketName: string;
  score: number | null;
  reasoning?: string;
}
