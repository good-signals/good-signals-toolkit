
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CBSAData, AIScoreResponse, TerritoryAnalysis } from '@/types/territoryTargeterTypes';
import { toast } from '@/hooks/use-toast';

const STORAGE_KEY = 'territoryTargeter_currentAnalysis';

export const useTerritoryScoring = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<TerritoryAnalysis | null>(() => {
    // Load saved analysis from localStorage on initialization
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          createdAt: new Date(parsed.createdAt)
        };
      } catch (error) {
        console.error('Failed to parse saved analysis:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    return null;
  });
  const [error, setError] = useState<string | null>(null);

  // Save analysis to localStorage whenever it changes
  useEffect(() => {
    if (currentAnalysis) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentAnalysis));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [currentAnalysis]);

  const runScoring = async (prompt: string, cbsaData: CBSAData[]) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Starting territory scoring analysis...');
      console.log('Prompt:', prompt);
      console.log('Markets to analyze:', cbsaData.length);
      
      const { data, error } = await supabase.functions.invoke('territory-scoring', {
        body: {
          userPrompt: prompt,
          cbsaData: cbsaData
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Analysis failed: ${error.message}`);
      }

      if (!data.success) {
        console.error('Function returned error:', data.error);
        console.error('Error details:', data.details);
        
        // Provide more user-friendly error messages
        let userErrorMessage = data.error || 'Unknown error occurred';
        
        if (userErrorMessage.includes('Failed to parse AI response')) {
          userErrorMessage = 'The AI service returned an unexpected format. Please try again with a simpler prompt.';
        } else if (userErrorMessage.includes('Perplexity API error')) {
          userErrorMessage = 'There was an issue connecting to the AI service. Please try again in a moment.';
        } else if (userErrorMessage.includes('timeout')) {
          userErrorMessage = 'The analysis is taking longer than expected. Please try again with a more specific prompt.';
        }
        
        throw new Error(userErrorMessage);
      }

      const aiResponse: AIScoreResponse = data.data;
      
      // Validate response data
      if (!aiResponse.scores || aiResponse.scores.length === 0) {
        throw new Error('No market scores were returned. Please try rephrasing your criteria.');
      }

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
      
      console.log('Analysis completed successfully');
      console.log('Suggested title:', aiResponse.suggested_title);
      console.log('Market signal score:', analysis.marketSignalScore);
      console.log('Number of scored markets:', aiResponse.scores.length);
      
      toast({
        title: "Territory Analysis Complete",
        description: `Successfully scored ${aiResponse.scores.length} markets for "${aiResponse.suggested_title}" with an average signal score of ${analysis.marketSignalScore}%.`,
      });

      return analysis;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Territory scoring error:', errorMessage);
      setError(errorMessage);
      
      toast({
        title: "Analysis Failed",
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

  const clearAnalysis = () => {
    setCurrentAnalysis(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    isLoading,
    currentAnalysis,
    error,
    runScoring,
    updateIncludedColumns,
    clearAnalysis
  };
};
