
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
        console.log('Loaded saved analysis from localStorage:', parsed.id);
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
  const analysisRequestRef = useRef<AbortController | null>(null);

  // Check for in-progress analysis on mount
  useEffect(() => {
    const savedState = localStorage.getItem(ANALYSIS_STATE_KEY);
    if (savedState) {
      try {
        const analysisState: AnalysisState = JSON.parse(savedState);
        console.log('Found saved analysis state:', analysisState);
        
        if (analysisState.status === 'running') {
          // Check if analysis has been running too long (timeout after 5 minutes)
          const elapsed = Date.now() - analysisState.startTime;
          if (elapsed > 5 * 60 * 1000) {
            console.log('Analysis timed out, cleaning up stale state');
            localStorage.removeItem(ANALYSIS_STATE_KEY);
            
            toast({
              title: "Analysis Timed Out",
              description: "Your previous analysis took too long and was cancelled. Please try again.",
              variant: "destructive",
            });
            return;
          }
          
          // Resume tracking the analysis
          console.log('Resuming analysis tracking for:', analysisState.id);
          setIsLoading(true);
          setAnalysisStartTime(analysisState.startTime);
          
          toast({
            title: "Analysis Resumed",
            description: "Continuing your territory analysis in the background...",
          });
        } else if (analysisState.status === 'completed') {
          // Clean up completed analysis state
          console.log('Cleaning up completed analysis state');
          localStorage.removeItem(ANALYSIS_STATE_KEY);
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
      console.log('Saving analysis to localStorage:', currentAnalysis.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentAnalysis));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [currentAnalysis]);

  const runScoring = async (prompt: string, cbsaData: CBSAData[]) => {
    console.log('Starting territory scoring analysis...');
    console.log('Prompt:', prompt);
    console.log('Markets to analyze:', cbsaData.length);
    
    setIsLoading(true);
    setError(null);
    
    // Cancel any existing request
    if (analysisRequestRef.current) {
      analysisRequestRef.current.abort();
    }
    
    const analysisId = crypto.randomUUID();
    const startTime = Date.now();
    setAnalysisStartTime(startTime);

    // Create new abort controller for this request
    analysisRequestRef.current = new AbortController();

    // Save analysis state to localStorage for persistence
    const analysisState: AnalysisState = {
      id: analysisId,
      prompt,
      cbsaData,
      startTime,
      status: 'running'
    };
    
    localStorage.setItem(ANALYSIS_STATE_KEY, JSON.stringify(analysisState));
    console.log('Saved analysis state to localStorage:', analysisId);

    try {
      const { data, error } = await supabase.functions.invoke('territory-scoring', {
        body: {
          userPrompt: prompt,
          cbsaData: cbsaData
        }
      });

      // Check if request was aborted
      if (analysisRequestRef.current?.signal.aborted) {
        console.log('Analysis request was aborted');
        return;
      }

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
      console.log('Received AI response:', {
        title: aiResponse.suggested_title,
        scoresCount: aiResponse.scores?.length || 0
      });
      
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

      console.log('Setting current analysis:', analysis.id);
      setCurrentAnalysis(analysis);
      
      // Update analysis state to completed
      const completedState = { ...analysisState, status: 'completed' as const };
      localStorage.setItem(ANALYSIS_STATE_KEY, JSON.stringify(completedState));
      console.log('Updated analysis state to completed');
      
      // Clean up analysis state after a short delay
      setTimeout(() => {
        localStorage.removeItem(ANALYSIS_STATE_KEY);
        console.log('Cleaned up analysis state');
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
      analysisRequestRef.current = null;
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

    console.log('Updating included columns:', columnIds);
    setCurrentAnalysis(updatedAnalysis);
  };

  const clearAnalysis = () => {
    console.log('Clearing analysis');
    
    // Cancel any ongoing request
    if (analysisRequestRef.current) {
      analysisRequestRef.current.abort();
      analysisRequestRef.current = null;
    }
    
    setCurrentAnalysis(null);
    setAnalysisStartTime(null);
    setIsLoading(false);
    setError(null);
    
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ANALYSIS_STATE_KEY);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (analysisRequestRef.current) {
        analysisRequestRef.current.abort();
      }
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
