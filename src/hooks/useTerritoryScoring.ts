
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
  const [analysisMode, setAnalysisMode] = useState<'fast' | 'detailed'>('detailed');
  const [estimatedDuration, setEstimatedDuration] = useState<number>(75);
  const analysisRequestRef = useRef<AbortController | null>(null);

  // Check for in-progress analysis on mount
  useEffect(() => {
    const savedState = localStorage.getItem(ANALYSIS_STATE_KEY);
    if (savedState) {
      try {
        const analysisState: AnalysisState = JSON.parse(savedState);
        console.log('Found saved analysis state:', analysisState);
        
        if (analysisState.status === 'running') {
          // Check if analysis has been running too long (timeout after 12 minutes now)
          const elapsed = Date.now() - analysisState.startTime;
          if (elapsed > 12 * 60 * 1000) {
            console.log('Analysis timed out, cleaning up stale state');
            localStorage.removeItem(ANALYSIS_STATE_KEY);
            
            toast({
              title: "Analysis Timed Out",
              description: "Your previous analysis took too long and was cancelled. Please try again with a simpler prompt or use Fast Analysis mode.",
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

  // Estimate analysis duration based on complexity
  const estimateAnalysisDuration = (prompt: string, marketCount: number, mode: 'fast' | 'detailed') => {
    const baseTime = mode === 'fast' ? 30 : 75;
    const complexityMultiplier = prompt.length > 200 ? 1.3 : 1;
    const marketMultiplier = marketCount > 75 ? 1.2 : 1;
    
    return Math.round(baseTime * complexityMultiplier * marketMultiplier);
  };

  // Process markets in chunks to avoid timeouts
  const processMarketsInChunks = async (prompt: string, cbsaData: CBSAData[], analysisId: string, mode: 'fast' | 'detailed') => {
    const chunkSize = mode === 'fast' ? 50 : 30; // Smaller chunks for detailed analysis
    const chunks = [];
    
    for (let i = 0; i < cbsaData.length; i += chunkSize) {
      chunks.push(cbsaData.slice(i, i + chunkSize));
    }

    console.log(`Processing ${cbsaData.length} markets in ${chunks.length} chunks of ~${chunkSize} markets each`);
    
    let allScores: any[] = [];
    let combinedSummary = '';
    let suggestedTitle = '';

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length} with ${chunk.length} markets`);
      
      const { data, error } = await supabase.functions.invoke('territory-scoring', {
        body: {
          userPrompt: prompt,
          cbsaData: chunk,
          analysisMode: mode,
          isChunked: chunks.length > 1,
          chunkIndex: i,
          totalChunks: chunks.length
        }
      });

      if (error) {
        throw new Error(`Chunk ${i + 1} failed: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(`Chunk ${i + 1} returned error: ${data.error}`);
      }

      allScores = [...allScores, ...data.data.scores];
      
      if (i === 0) {
        // Use the first chunk's summary and title
        combinedSummary = data.data.prompt_summary;
        suggestedTitle = data.data.suggested_title;
      }

      // Update progress toast
      if (chunks.length > 1) {
        toast({
          title: "Processing Markets",
          description: `Completed ${i + 1} of ${chunks.length} chunks (${allScores.length}/${cbsaData.length} markets scored)`,
        });
      }
    }

    return {
      suggested_title: suggestedTitle,
      prompt_summary: combinedSummary,
      scores: allScores
    };
  };

  // Retry with simpler analysis if detailed fails
  const retryWithSimpleAnalysis = async (prompt: string, cbsaData: CBSAData[], analysisId: string) => {
    console.log('Retrying with fast analysis mode after timeout...');
    
    toast({
      title: "Switching to Fast Analysis",
      description: "Detailed analysis timed out. Trying with faster mode...",
    });

    setAnalysisMode('fast');
    const newDuration = estimateAnalysisDuration(prompt, cbsaData.length, 'fast');
    setEstimatedDuration(newDuration);

    return await processMarketsInChunks(prompt, cbsaData, analysisId, 'fast');
  };

  const runScoring = async (prompt: string, cbsaData: CBSAData[], mode: 'fast' | 'detailed' = 'detailed') => {
    console.log('Starting territory scoring analysis...');
    console.log('Prompt:', prompt);
    console.log('Markets to analyze:', cbsaData.length);
    console.log('Analysis mode:', mode);
    
    setIsLoading(true);
    setError(null);
    setAnalysisMode(mode);
    
    // Cancel any existing request
    if (analysisRequestRef.current) {
      analysisRequestRef.current.abort();
    }
    
    const analysisId = crypto.randomUUID();
    const startTime = Date.now();
    setAnalysisStartTime(startTime);

    // Estimate duration and provide user feedback
    const duration = estimateAnalysisDuration(prompt, cbsaData.length, mode);
    setEstimatedDuration(duration);

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

    // Show initial feedback with estimated time
    toast({
      title: `Starting ${mode === 'fast' ? 'Fast' : 'Detailed'} Analysis`,
      description: `Estimated completion time: ${Math.round(duration / 60)} minutes. Analyzing ${cbsaData.length} markets...`,
    });

    try {
      let aiResponse: AIScoreResponse;

      try {
        // Try main analysis approach first
        if (cbsaData.length > 50 || mode === 'fast') {
          // Use chunked processing for large datasets or fast mode
          aiResponse = await processMarketsInChunks(prompt, cbsaData, analysisId, mode);
        } else {
          // Single request for smaller datasets in detailed mode
          const { data, error } = await supabase.functions.invoke('territory-scoring', {
            body: {
              userPrompt: prompt,
              cbsaData: cbsaData,
              analysisMode: mode
            }
          });

          if (error) {
            throw new Error(`Analysis failed: ${error.message}`);
          }

          if (!data.success) {
            throw new Error(data.error || 'Unknown error occurred');
          }

          aiResponse = data.data;
        }
      } catch (primaryError) {
        console.error('Primary analysis failed:', primaryError);
        
        // If we were doing detailed analysis, try fast mode as fallback
        if (mode === 'detailed') {
          aiResponse = await retryWithSimpleAnalysis(prompt, cbsaData, analysisId);
        } else {
          throw primaryError;
        }
      }

      // Check if request was aborted
      if (analysisRequestRef.current?.signal.aborted) {
        console.log('Analysis request was aborted');
        return;
      }

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
      
      const actualDuration = Math.round((Date.now() - startTime) / 1000);
      console.log('Analysis completed successfully in', actualDuration, 'seconds');
      
      toast({
        title: "Territory Analysis Complete",
        description: `Successfully scored ${aiResponse.scores.length} markets for "${aiResponse.suggested_title}" in ${Math.round(actualDuration / 60)} minutes with an average signal score of ${analysis.marketSignalScore}%.`,
      });

      return analysis;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Territory scoring error:', errorMessage);
      setError(errorMessage);
      
      // Update analysis state to failed
      const failedState = { ...analysisState, status: 'failed' as const };
      localStorage.setItem(ANALYSIS_STATE_KEY, JSON.stringify(failedState));
      
      // Provide helpful error feedback
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('timeout') || errorMessage.includes('took too long')) {
        userFriendlyMessage = `Analysis timed out. Try using Fast Analysis mode or simplifying your prompt. Complex analyses can take up to 12 minutes.`;
      }
      
      toast({
        title: "Analysis Failed",
        description: userFriendlyMessage,
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
    setAnalysisMode('detailed');
    setEstimatedDuration(75);
    
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
    analysisMode,
    estimatedDuration,
    runScoring,
    updateIncludedColumns,
    clearAnalysis,
    setAnalysisMode
  };
};
