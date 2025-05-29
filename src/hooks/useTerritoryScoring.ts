
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CBSAData, AIScoreResponse, TerritoryAnalysis } from '@/types/territoryTargeterTypes';
import { toast } from '@/hooks/use-toast';

export const useTerritoryScoring = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<TerritoryAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runScoring = async (prompt: string, cbsaData: CBSAData[]) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Running territory scoring with prompt:', prompt);
      
      const { data, error } = await supabase.functions.invoke('territory-scoring', {
        body: {
          userPrompt: prompt,
          cbsaData: cbsaData
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred');
      }

      const aiResponse: AIScoreResponse = data.data;
      
      // Calculate market signal score (average of all scores)
      const averageScore = aiResponse.scores.reduce((sum, score) => sum + score.score, 0) / aiResponse.scores.length;
      
      const analysis: TerritoryAnalysis = {
        id: crypto.randomUUID(),
        prompt,
        results: aiResponse,
        marketSignalScore: Math.round(averageScore),
        createdAt: new Date(),
        includedColumns: ['score'] // Default to including the main score column
      };

      setCurrentAnalysis(analysis);
      
      toast({
        title: "Territory Analysis Complete",
        description: `Scored ${aiResponse.scores.length} markets successfully.`,
      });

      return analysis;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      
      toast({
        title: "Scoring Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateIncludedColumns = (columnIds: string[]) => {
    if (!currentAnalysis) return;

    // Recalculate market signal score based on included columns
    const scores = currentAnalysis.results.scores.map(s => s.score);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    const updatedAnalysis = {
      ...currentAnalysis,
      includedColumns: columnIds,
      marketSignalScore: Math.round(averageScore)
    };

    setCurrentAnalysis(updatedAnalysis);
  };

  return {
    isLoading,
    currentAnalysis,
    error,
    runScoring,
    updateIncludedColumns,
    clearAnalysis: () => setCurrentAnalysis(null)
  };
};
