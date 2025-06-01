
export interface CBSAData {
  id?: string;
  name: string;
  state?: string;
  region?: string;
  population?: number;
  populationGrowth?: number;
  medianIncome?: number;
  unemploymentRate?: number;
  score?: number;
  // Add other properties as needed
}

export interface CBSATableRowData {
  id: string;
  name: string;
  state: string;
  region: string;
  population?: number;
  populationGrowth?: number;
  medianIncome?: number;
  unemploymentRate?: number;
  score?: number;
  criteriaScores: { [columnId: string]: { score: number; reasoning: string; sources?: string[]; } };
  marketSignalScore: number;
}

export interface CriteriaColumn {
  id: string;
  title: string;
  prompt: string;
  analysisMode: 'fast' | 'detailed';
  scores: { market: string; score: number | null; reasoning?: string; sources?: string[]; }[];
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
