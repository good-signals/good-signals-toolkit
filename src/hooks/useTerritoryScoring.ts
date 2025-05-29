
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CBSAData, AIScoreResponse, TerritoryAnalysis } from '@/types/territoryTargeterTypes';
import { toast } from '@/hooks/use-toast';

const STORAGE_KEY = 'territoryTargeter_currentAnalysis';
const ANALYSIS_STATE_KEY = 'territoryTargeter_analysisState';

interface AnalysisState {
  id: string;
  prompt: string;
  cbsaData: CBSAData[];
  startTime: number;
  status: 'running' | 'completed' | 'failed';
}

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
  const [analysisStartTime, setAnalysisStartTime] = useState<number | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Check for in-progress analysis on mount
  useEffect(() => {
    const savedState = localStorage.getItem(ANALYSIS_STATE_KEY);
    if (savedState) {
      try {
        const analysisState: AnalysisState = JSON.parse(savedState);
        if (analysisState.status === 'running') {
          // Resume tracking the analysis
          console.log('Resuming analysis tracking for:', analysisState.id);
          setIsLoading(true);
          setAnalysisStartTime(analysisState.startTime);
          startPolling(analysisState);
          
          toast({
            title: "Analysis Resumed",
            description: "Continuing your territory analysis in the background...",
          });
        }
      } catch (error) {
        console.error('Failed to parse saved analysis state:', error);
        localStorage.removeItem(ANALYSIS_STATE_KEY);
      }
    }
  }, []);

  // Save analysis to localStorage whenever it changes
  useEffect(() => {
    if (currentAnalysis) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentAnalysis));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [currentAnalysis]);

  const startPolling = (analysisState: AnalysisState) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(async () => {
      try {
        // Check if analysis has been running too long (timeout after 5 minutes)
        const elapsed = Date.now() - analysisState.startTime;
        if (elapsed > 5 * 60 * 1000) {
          throw new Error('Analysis timed out after 5 minutes');
        }

        // In a real implementation, you might check a database or status endpoint
        // For now, we'll simulate checking if the analysis is complete
        // This would be replaced with actual status checking logic
        
      } catch (error) {
        console.error('Polling error:', error);
        stopPolling();
        setIsLoading(false);
        setError('Analysis monitoring failed');
        
        // Clean up stale analysis state
        localStorage.removeItem(ANALYSIS_STATE_KEY);
        
        toast({
          title: "Analysis Monitoring Failed",
          description: "Please try running the analysis again.",
          variant: "destructive",
        });
      }
    }, 5000); // Poll every 5 seconds
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const runScoring = async (prompt: string, cbsaData: CBSAData[]) => {
    setIsLoading(true);
    setError(null);
    
    const analysisId = crypto.randomUUID();
    const startTime = Date.now();
    setAnalysisStartTime(startTime);

    // Save analysis state to localStorage for persistence
    const analysisState: AnalysisState = {
      id: analysisId,
      prompt,
      cbsaData,
      startTime,
      status: 'running'
    };
    
    localStorage.setItem(ANALYSIS_STATE_KEY, JSON.stringify(analysisState));

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
        id: analysisId,
        prompt,
        results: aiResponse,
        marketSignalScore: Math.round(averageScore),
        createdAt: new Date(),
        includedColumns: ['score'] // Default to including the main score column
      };

      setCurrentAnalysis(analysis);
      
      // Update analysis state to completed
      const completedState = { ...analysisState, status: 'completed' as const };
      localStorage.setItem(ANALYSIS_STATE_KEY, JSON.stringify(completedState));
      
      // Clean up analysis state after a short delay
      setTimeout(() => {
        localStorage.removeItem(ANALYSIS_STATE_KEY);
      }, 2000);
      
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
      
      // Update analysis state to failed
      const failedState = { ...analysisState, status: 'failed' as const };
      localStorage.setItem(ANALYSIS_STATE_KEY, JSON.stringify(failedState));
      
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    } finally {
      setIsLoading(false);
      setAnalysisStartTime(null);
      stopPolling();
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
    setAnalysisStartTime(null);
    stopPolling();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ANALYSIS_STATE_KEY);
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  return {
    isLoading,
    currentAnalysis,
    error,
    analysisStartTime,
    runScoring,
    updateIncludedColumns,
    clearAnalysis
  };
};
