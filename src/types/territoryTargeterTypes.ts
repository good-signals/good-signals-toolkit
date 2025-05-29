
export interface CBSAData {
  id: string;
  name: string;
  state: string;
  region: string;
  population: number;
  populationGrowth: number; // Growth rate as decimal (e.g., 0.0606 for 6.06%)
  rank: number;
  status?: 'Active' | 'Pipeline' | 'Priority' | 'Hold' | 'Avoid';
}

export interface CBSAScore {
  market: string;
  score: number;
  reasoning: string;
  sources?: string[];
}

export interface CriteriaColumn {
  id: string;
  title: string;
  prompt: string;
  scores: CBSAScore[];
  logicSummary: string;
  analysisMode: 'fast' | 'detailed';
  createdAt: Date;
  isManuallyOverridden?: { [marketName: string]: boolean };
  isIncludedInSignalScore?: boolean; // New property to track inclusion in Market Signal Score
}

export interface AIScoreResponse {
  suggested_title: string;
  prompt_summary: string;
  scores: CBSAScore[];
}

export interface TerritoryAnalysis {
  id: string;
  criteriaColumns: CriteriaColumn[];
  marketSignalScore: number;
  createdAt: Date;
  includedColumns: string[];
}

export interface ColumnToggleSettings {
  [columnId: string]: boolean;
}

export interface ManualScoreOverride {
  marketName: string;
  columnId: string;
  score: number;
  reasoning: string;
}
