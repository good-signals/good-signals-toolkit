import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CBSAData, AIScoreResponse, TerritoryAnalysis, CriteriaColumn, ManualScoreOverride } from '@/types/territoryTargeterTypes';
import { toast } from '@/hooks/use-toast';
import { safeStorage } from '@/utils/safeStorage';

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
    // Safely load saved analysis from localStorage
    const saved = safeStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = safeStorage.safeParse(saved, null);
        if (parsed) {
          console.log('Loaded saved analysis from localStorage:', parsed.id);
          return {
            ...parsed,
            createdAt: new Date(parsed.createdAt),
            criteriaColumns: parsed.criteriaColumns?.map((col: any) => ({
              ...col,
              createdAt: new Date(col.createdAt)
            })) || []
          };
        }
      } catch (error) {
        console.error('Failed to load saved analysis:', error);
        safeStorage.removeItem(STORAGE_KEY);
      }
    }
    return null;
  });
  const [error, setError] = useState<string | null>(null);
  const [analysisStartTime, setAnalysisStartTime] = useState<number | null>(null);
  const [analysisMode, setAnalysisMode] = useState<'fast' | 'detailed'>('detailed');
  const [estimatedDuration, setEstimatedDuration] = useState<number>(75);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const analysisRequestRef = useRef<AbortController | null>(null);

  // Check for in-progress analysis on mount
  useEffect(() => {
    try {
      const savedState = safeStorage.getItem(ANALYSIS_STATE_KEY);
      if (savedState) {
        const analysisState: AnalysisState = safeStorage.safeParse(savedState, null);
        
        if (analysisState) {
          console.log('Found saved analysis state:', analysisState);
          
          if (analysisState.status === 'running') {
            // Check if analysis has been running too long (timeout after 12 minutes now)
            const elapsed = Date.now() - analysisState.startTime;
            if (elapsed > 12 * 60 * 1000) {
              console.log('Analysis timed out, cleaning up stale state');
              safeStorage.removeItem(ANALYSIS_STATE_KEY);
              
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
            safeStorage.removeItem(ANALYSIS_STATE_KEY);
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse saved analysis state:', error);
      safeStorage.removeItem(ANALYSIS_STATE_KEY);
    }
  }, []);

  // Save analysis to localStorage whenever it changes
  useEffect(() => {
    if (currentAnalysis) {
      console.log('Saving analysis to localStorage:', currentAnalysis.id);
      safeStorage.setItem(STORAGE_KEY, JSON.stringify(currentAnalysis));
    } else {
      safeStorage.removeItem(STORAGE_KEY);
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
    const chunkSize = mode === 'fast' ? 50 : 30;
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
        combinedSummary = data.data.prompt_summary;
        suggestedTitle = data.data.suggested_title;
      }

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

  const cancelAnalysis = () => {
    console.log('Cancelling territory analysis...');
    
    // Abort the current request
    if (analysisRequestRef.current) {
      analysisRequestRef.current.abort();
      analysisRequestRef.current = null;
    }

    // Clean up state
    setIsLoading(false);
    setAnalysisStartTime(null);
    setError(null);
    
    // Clean up saved analysis state
    safeStorage.removeItem(ANALYSIS_STATE_KEY);
    
    toast({
      title: "Analysis Cancelled",
      description: "Territory analysis has been cancelled. You can start a new analysis.",
    });
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
    
    if (!safeStorage.setItem(ANALYSIS_STATE_KEY, JSON.stringify(analysisState))) {
      console.warn('Failed to save analysis state to localStorage');
    }

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
            },
            signal: analysisRequestRef.current?.signal
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
        
        // Check if this was an abort error
        if (primaryError instanceof Error && primaryError.name === 'AbortError') {
          console.log('Analysis was cancelled by user');
          return;
        }
        
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

      // Create new criteria column
      const newColumn: CriteriaColumn = {
        id: crypto.randomUUID(),
        title: aiResponse.suggested_title,
        prompt: prompt,
        scores: aiResponse.scores,
        logicSummary: aiResponse.prompt_summary,
        analysisMode: mode,
        createdAt: new Date(),
        isManuallyOverridden: {},
        isIncludedInSignalScore: true // Default to included
      };

      // Add to existing analysis or create new one
      let updatedAnalysis: TerritoryAnalysis;
      if (currentAnalysis) {
        updatedAnalysis = {
          ...currentAnalysis,
          criteriaColumns: [...currentAnalysis.criteriaColumns, newColumn],
          includedColumns: [...currentAnalysis.includedColumns, newColumn.id]
        };
      } else {
        const averageScore = aiResponse.scores.reduce((sum, score) => sum + score.score, 0) / aiResponse.scores.length;
        updatedAnalysis = {
          id: analysisId,
          criteriaColumns: [newColumn],
          marketSignalScore: Math.round(averageScore),
          createdAt: new Date(),
          includedColumns: [newColumn.id]
        };
      }

      console.log('Setting current analysis:', updatedAnalysis.id);
      setCurrentAnalysis(updatedAnalysis);
      
      // Update analysis state to completed
      const completedState = { ...analysisState, status: 'completed' as const };
      safeStorage.setItem(ANALYSIS_STATE_KEY, JSON.stringify(completedState));
      console.log('Updated analysis state to completed');
      
      // Clean up analysis state after a short delay
      setTimeout(() => {
        safeStorage.removeItem(ANALYSIS_STATE_KEY);
        console.log('Cleaned up analysis state');
      }, 2000);
      
      const actualDuration = Math.round((Date.now() - startTime) / 1000);
      console.log('Analysis completed successfully in', actualDuration, 'seconds');
      
      toast({
        title: "Territory Analysis Complete",
        description: `Successfully added "${aiResponse.suggested_title}" criteria with ${aiResponse.scores.length} market scores in ${Math.round(actualDuration / 60)} minutes.`,
      });

      return updatedAnalysis;
    } catch (err) {
      // Check if this was an abort error
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Analysis was cancelled by user');
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Territory scoring error:', errorMessage);
      setError(errorMessage);
      
      // Update analysis state to failed
      const failedState = { ...analysisState, status: 'failed' as const };
      safeStorage.setItem(ANALYSIS_STATE_KEY, JSON.stringify(failedState));
      
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

  const refreshColumn = async (columnId: string, type: 'all' | 'na-only', cbsaData: CBSAData[]) => {
    if (!currentAnalysis) return;

    const column = currentAnalysis.criteriaColumns.find(c => c.id === columnId);
    if (!column) return;

    setIsRefreshing(true);
    
    try {
      // Determine which markets to refresh
      let marketsToRefresh = cbsaData;
      if (type === 'na-only') {
        const naMarkets = column.scores
          .filter(score => score.score === null || score.score === undefined)
          .map(score => score.market);
        marketsToRefresh = cbsaData.filter(cbsa => naMarkets.includes(cbsa.name));
      }

      if (marketsToRefresh.length === 0) {
        toast({
          title: "No Markets to Refresh",
          description: "All markets already have scores for this criteria.",
        });
        return;
      }

      // Run analysis for the specified markets
      const { data, error } = await supabase.functions.invoke('territory-scoring', {
        body: {
          userPrompt: column.prompt,
          cbsaData: marketsToRefresh,
          analysisMode: column.analysisMode
        }
      });

      if (error) {
        throw new Error(`Refresh failed: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred during refresh');
      }

      // Update the column with new scores
      const updatedColumn = { ...column };
      data.data.scores.forEach((newScore: any) => {
        const existingIndex = updatedColumn.scores.findIndex(s => s.market === newScore.market);
        if (existingIndex !== -1) {
          updatedColumn.scores[existingIndex] = newScore;
        } else {
          updatedColumn.scores.push(newScore);
        }
      });

      // Update the analysis
      const updatedAnalysis = {
        ...currentAnalysis,
        criteriaColumns: currentAnalysis.criteriaColumns.map(c => 
          c.id === columnId ? updatedColumn : c
        )
      };

      setCurrentAnalysis(updatedAnalysis);

      toast({
        title: "Column Refreshed",
        description: `Successfully refreshed ${marketsToRefresh.length} markets for "${column.title}".`,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Column refresh error:', errorMessage);
      
      toast({
        title: "Refresh Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const applyManualOverride = (override: ManualScoreOverride) => {
    if (!currentAnalysis) return;

    const updatedAnalysis = {
      ...currentAnalysis,
      criteriaColumns: currentAnalysis.criteriaColumns.map(column => {
        if (column.id !== override.columnId) return column;

        // Update the score
        const updatedScores = column.scores.map(score => 
          score.market === override.marketName 
            ? { ...score, score: override.score, reasoning: override.reasoning }
            : score
        );

        // If no existing score, add new one
        if (!updatedScores.some(s => s.market === override.marketName)) {
          updatedScores.push({
            market: override.marketName,
            score: override.score,
            reasoning: override.reasoning
          });
        }

        // Mark as manually overridden
        const isManuallyOverridden = { ...column.isManuallyOverridden };
        isManuallyOverridden[override.marketName] = true;

        return {
          ...column,
          scores: updatedScores,
          isManuallyOverridden
        };
      })
    };

    setCurrentAnalysis(updatedAnalysis);

    toast({
      title: "Score Updated",
      description: `Manual override applied for ${override.marketName}.`,
    });
  };

  const updateIncludedColumns = (columnToggleSettings: { [columnId: string]: boolean }) => {
    if (!currentAnalysis) return;

    const updatedAnalysis = {
      ...currentAnalysis,
      includedColumns: Object.entries(columnToggleSettings)
        .filter(([_, isIncluded]) => isIncluded)
        .map(([columnId]) => columnId)
    };

    setCurrentAnalysis(updatedAnalysis);
  };

  const clearAnalysis = () => {
    setCurrentAnalysis(null);
    setError(null);
    safeStorage.removeItem(STORAGE_KEY);
    safeStorage.removeItem(ANALYSIS_STATE_KEY);
    
    toast({
      title: "Analysis Cleared",
      description: "Territory analysis has been cleared.",
    });
  };

  const toggleColumnInSignalScore = (columnId: string, included: boolean) => {
    if (!currentAnalysis) return;

    const updatedAnalysis = {
      ...currentAnalysis,
      criteriaColumns: currentAnalysis.criteriaColumns.map(column =>
        column.id === columnId
          ? { ...column, isIncludedInSignalScore: included }
          : column
      )
    };

    setCurrentAnalysis(updatedAnalysis);

    toast({
      title: included ? "Column Included" : "Column Excluded",
      description: `${currentAnalysis.criteriaColumns.find(c => c.id === columnId)?.title} ${included ? 'included in' : 'excluded from'} Market Signal Score calculation.`,
    });
  };

  const deleteColumn = (columnId: string) => {
    if (!currentAnalysis) return;

    const columnToDelete = currentAnalysis.criteriaColumns.find(c => c.id === columnId);
    if (!columnToDelete) return;

    const updatedAnalysis = {
      ...currentAnalysis,
      criteriaColumns: currentAnalysis.criteriaColumns.filter(column => column.id !== columnId),
      includedColumns: currentAnalysis.includedColumns.filter(id => id !== columnId)
    };

    // If no columns left, clear the entire analysis
    if (updatedAnalysis.criteriaColumns.length === 0) {
      setCurrentAnalysis(null);
      safeStorage.removeItem(STORAGE_KEY);
    } else {
      setCurrentAnalysis(updatedAnalysis);
    }

    toast({
      title: "Column Deleted",
      description: `"${columnToDelete.title}" has been removed from the analysis.`,
    });
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
    isRefreshing,
    runScoring,
    cancelAnalysis,
    refreshColumn,
    applyManualOverride,
    updateIncludedColumns,
    toggleColumnInSignalScore,
    deleteColumn,
    clearAnalysis,
    setAnalysisMode
  };
};
