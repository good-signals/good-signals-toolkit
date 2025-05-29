
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CBSAData, AIScoreResponse, CriteriaColumn, ManualScoreOverride } from '@/types/territoryTargeterTypes';
import { toast } from '@/hooks/use-toast';
import { useAnalysisState } from './territory-targeter/useAnalysisState';
import { useAnalysisEstimation } from './territory-targeter/useAnalysisEstimation';
import { useAnalysisProcessing } from './territory-targeter/useAnalysisProcessing';
import { useColumnOperations } from './territory-targeter/useColumnOperations';

export const useTerritoryScoring = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisStartTime, setAnalysisStartTime] = useState<number | null>(null);
  const [analysisMode, setAnalysisMode] = useState<'fast' | 'detailed'>('detailed');
  const [estimatedDuration, setEstimatedDuration] = useState<number>(75);

  const {
    currentAnalysis,
    setCurrentAnalysis,
    saveAnalysisState,
    getAnalysisState,
    clearAnalysisState,
    clearAnalysis
  } = useAnalysisState();

  const { estimateAnalysisDuration } = useAnalysisEstimation();
  
  const {
    analysisRequestRef,
    processMarketsInChunks,
    retryWithSimpleAnalysis,
    cancelAnalysis: cancelRequest
  } = useAnalysisProcessing();

  const {
    isRefreshing,
    refreshStartTime,
    refreshColumn: refreshColumnOperation,
    applyManualOverride: applyOverride,
    toggleColumnInSignalScore: toggleColumn,
    deleteColumn: deleteColumnOperation
  } = useColumnOperations();

  // Check for in-progress analysis on mount
  useEffect(() => {
    try {
      const analysisState = getAnalysisState();
      
      if (analysisState) {
        console.log('Found saved analysis state:', analysisState);
        
        if (analysisState.status === 'running') {
          // Check if analysis has been running too long (timeout after 12 minutes now)
          const elapsed = Date.now() - analysisState.startTime;
          if (elapsed > 12 * 60 * 1000) {
            console.log('Analysis timed out, cleaning up stale state');
            clearAnalysisState();
            
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
          clearAnalysisState();
        }
      }
    } catch (error) {
      console.error('Failed to parse saved analysis state:', error);
      clearAnalysisState();
    }
  }, []);

  const cancelAnalysis = () => {
    cancelRequest();
    
    // Clean up state
    setIsLoading(false);
    setAnalysisStartTime(null);
    setError(null);
    
    // Clean up saved analysis state
    clearAnalysisState();
    
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
    const analysisState = {
      id: analysisId,
      prompt,
      cbsaData,
      startTime,
      status: 'running' as const
    };
    
    saveAnalysisState(analysisState);

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
        
        // Check if this was an abort error
        if (primaryError instanceof Error && (primaryError.name === 'AbortError' || primaryError.message === 'Analysis was cancelled')) {
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
      let updatedAnalysis;
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
      saveAnalysisState(completedState);
      console.log('Updated analysis state to completed');
      
      // Clean up analysis state after a short delay
      setTimeout(() => {
        clearAnalysisState();
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
      if (err instanceof Error && (err.name === 'AbortError' || err.message === 'Analysis was cancelled')) {
        console.log('Analysis was cancelled by user');
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Territory scoring error:', errorMessage);
      setError(errorMessage);
      
      // Update analysis state to failed
      const failedState = { ...analysisState, status: 'failed' as const };
      saveAnalysisState(failedState);
      
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
    
    const updatedAnalysis = await refreshColumnOperation(
      columnId, 
      type, 
      cbsaData, 
      currentAnalysis,
      // onRefreshStart callback
      (startTime: number) => {
        setIsLoading(true);
        setAnalysisStartTime(startTime);
        const column = currentAnalysis.criteriaColumns.find(c => c.id === columnId);
        if (column) {
          setAnalysisMode(column.analysisMode || 'detailed');
          const duration = estimateAnalysisDuration(column.prompt, cbsaData.length, column.analysisMode || 'detailed');
          setEstimatedDuration(duration);
        }
      },
      // onRefreshEnd callback
      () => {
        setIsLoading(false);
        setAnalysisStartTime(null);
      }
    );
    
    if (updatedAnalysis) {
      setCurrentAnalysis(updatedAnalysis);
    }
  };

  const applyManualOverride = (override: ManualScoreOverride) => {
    if (!currentAnalysis) return;
    const updatedAnalysis = applyOverride(override, currentAnalysis);
    if (updatedAnalysis) {
      setCurrentAnalysis(updatedAnalysis);
    }
  };

  const toggleColumnInSignalScore = (columnId: string, included: boolean) => {
    if (!currentAnalysis) return;
    const updatedAnalysis = toggleColumn(columnId, included, currentAnalysis);
    if (updatedAnalysis) {
      setCurrentAnalysis(updatedAnalysis);
    }
  };

  const deleteColumn = (columnId: string) => {
    if (!currentAnalysis) return;
    const updatedAnalysis = deleteColumnOperation(columnId, currentAnalysis);
    if (updatedAnalysis === null) {
      // All columns were deleted, clear entire analysis
      clearAnalysis();
    } else if (updatedAnalysis) {
      setCurrentAnalysis(updatedAnalysis);
    }
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

  const handleClearAnalysis = () => {
    clearAnalysis();
    
    toast({
      title: "Analysis Cleared",
      description: "Territory analysis has been cleared.",
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
    isLoading: isLoading || isRefreshing,
    currentAnalysis,
    error,
    analysisStartTime: analysisStartTime || refreshStartTime,
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
    clearAnalysis: handleClearAnalysis,
    setAnalysisMode
  };
};
