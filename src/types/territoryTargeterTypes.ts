
export interface CBSAData {
  id: string;
  name: string;
  state: string;
  population: number;
  rank: number;
}

export interface CBSAScore {
  market: string;
  score: number;
  reasoning: string;
}

export interface AIScoreResponse {
  prompt_summary: string;
  scores: CBSAScore[];
}

export interface TerritoryAnalysis {
  id: string;
  prompt: string;
  results: AIScoreResponse;
  marketSignalScore: number;
  createdAt: Date;
  includedColumns: string[];
}

export interface ColumnToggleSettings {
  [columnId: string]: boolean;
}
