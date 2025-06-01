
export interface CBSAData {
  id: string; // Make id required since it's used as a key
  name: string;
  state: string; // Make state required since it's used in the table
  region: string; // Make region required since it's used in the table
  population: number; // Make population required since it's used in the table
  populationGrowth: number; // Make populationGrowth required since it's used in the table
  medianIncome?: number;
  unemploymentRate?: number;
  score?: number;
  rank?: number; // Add rank property since it's used in sample data
  status?: string; // Add status property for CBSA status
  // Add other properties as needed
}

export interface CBSATableRowData {
  id: string;
  name: string;
  state: string;
  region: string;
  population: number;
  populationGrowth: number;
  status?: CBSAStatus;
  criteriaScores: { [columnId: string]: { score: number | null; reasoning: string | null; sources?: string[]; } };
  marketSignalScore?: number | null;
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
