import { useState, useEffect, useRef } from 'react';
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
  const [analysisMode, setAnalysisMode] = useState<'fast' | 'detailed'>('fast');
  const [estimatedDuration, setEstimatedDuration] = useState<number>(60);
  const isProcessingRef = useRef(false);

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
    refreshingColumnId,
    refreshStartTime,
    refreshColumn: refreshColumnOperation,
    applyManualOverride: applyOverride,
    toggleColumnInSignalScore: toggleColumn,
    deleteColumn: deleteColumnOperation
  } = useColumnOperations();

  // Improved startup state check
  useEffect(() => {
    try {
      const analysisState = getAnalysisState();
      
      if (analysisState && analysisState.status === 'running') {
        // Check if analysis has been running too long
        const elapsed = Date.now() - analysisState.startTime;
        const maxRunTime = 15 * 60 * 1000; // 15 minutes max
        
        if (elapsed > maxRunTime) {
          console.log('Analysis timed out, cleaning up stale state');
          clearAnalysisState();
          
          toast({
            title: "Previous Analysis Timed Out",
            description: "Your previous analysis took too long and was cancelled. You can start a new analysis.",
            variant: "destructive",
          });
        } else {
          // Don't resume automatic tracking to avoid conflicts
          console.log('Found previous running analysis, but not resuming to avoid conflicts');
          clearAnalysisState();
        }
      }
    } catch (error) {
      console.error('Failed to check saved analysis state:', error);
      clearAnalysisState();
    }
  }, []);

  const cancelAnalysis = () => {
    console.log('Cancelling territory analysis...');
    
    // Mark as not processing
    isProcessingRef.current = false;
    
    // Cancel the request
    cancelRequest();
    
    // Clean up state
    setIsLoading(false);
    setAnalysisStartTime(null);
    setError(null);
    
    // Clean up saved analysis state
    clearAnalysisState();
    
    toast({
      title: "Analysis Cancelled",
      description: "Territory analysis has been cancelled.",
    });
  };

  const runScoring = async (prompt: string, cbsaData: CBSAData[], mode: 'fast' | 'detailed' = 'fast') => {
    console.log('=== RUN SCORING START ===');
    console.log('Starting territory scoring analysis...');
    console.log('Prompt:', prompt);
    console.log('Markets to analyze:', cbsaData.length);
    console.log('Analysis mode:', mode);
    
    // Prevent multiple simultaneous analyses
    if (isLoading || isProcessingRef.current) {
      console.log('Analysis already in progress, rejecting new request');
      toast({
        title: "Analysis in Progress",
        description: "Please wait for the current analysis to complete before starting a new one.",
        variant: "destructive",
      });
      return;
    }

    // Mark as processing
    isProcessingRef.current = true;
    setIsLoading(true);
    setError(null);
    setAnalysisMode(mode);
    
    // Cancel any existing request
    if (analysisRequestRef.current) {
      console.log('Cancelling existing request');
      analysisRequestRef.current.abort();
    }
    
    const analysisId = crypto.randomUUID();
    const startTime = Date.now();
    setAnalysisStartTime(startTime);

    console.log('Analysis ID:', analysisId);

    // Estimate duration and provide user feedback
    const duration = estimateAnalysisDuration(prompt, cbsaData.length, mode);
    setEstimatedDuration(duration);
    console.log('Estimated duration:', duration, 'seconds');

    // Create new abort controller for this request
    analysisRequestRef.current = new AbortController();

    // Save analysis state for recovery
    const analysisState = {
      id: analysisId,
      prompt,
      cbsaData,
      startTime,
      status: 'running' as const
    };
    
    console.log('Saving analysis state');
    saveAnalysisState(analysisState);

    // Show initial feedback
    toast({
      title: `Starting ${mode === 'fast' ? 'Fast' : 'Detailed'} Analysis`,
      description: `Analyzing ${cbsaData.length} markets. This may take ${Math.round(duration / 60)} minutes.`,
    });

    try {
      let aiResponse: AIScoreResponse;

      console.log('Starting AI analysis...');
      try {
        // Use chunked processing for better reliability
        aiResponse = await processMarketsInChunks(prompt, cbsaData, analysisId, mode);
        console.log('AI analysis completed successfully');
      } catch (primaryError) {
        console.error('Primary analysis failed:', primaryError);
        
        // Check if this was a cancellation
        if (primaryError instanceof Error && (primaryError.name === 'AbortError' || primaryError.message.includes('cancelled'))) {
          console.log('Analysis was cancelled by user');
          return undefined;
        }
        
        // If we were doing detailed analysis, try fast mode as fallback
        if (mode === 'detailed') {
          console.log('Detailed analysis failed, trying fast mode fallback');
          try {
            aiResponse = await retryWithSimpleAnalysis(prompt, cbsaData, analysisId);
          } catch (fallbackError) {
            console.log('Fallback also failed');
            throw primaryError;
          }
        } else {
          throw primaryError;
        }
      }

      // Check if request was aborted after completion
      if (analysisRequestRef.current?.signal.aborted) {
        console.log('Analysis was aborted after completion');
        return undefined;
      }

      console.log('Processing AI response...');
      // Validate response data
      if (!aiResponse.scores || !Array.isArray(aiResponse.scores) || aiResponse.scores.length === 0) {
        throw new Error('No market scores were returned. Please try rephrasing your criteria.');
      }

      // Create new criteria column
      const newColumn: CriteriaColumn = {
        id: crypto.randomUUID(),
        title: aiResponse.suggested_title || 'Analysis Results',
        prompt: prompt,
        scores: aiResponse.scores,
        logicSummary: aiResponse.prompt_summary || '',
        analysisMode: mode,
        createdAt: new Date(),
        isManuallyOverridden: {},
        isIncludedInSignalScore: true
      };

      // Add to existing analysis or create new one
      let updatedAnalysis;
      if (currentAnalysis) {
        console.log('Adding column to existing analysis');
        updatedAnalysis = {
          ...currentAnalysis,
          criteriaColumns: [...currentAnalysis.criteriaColumns, newColumn],
          includedColumns: [...(currentAnalysis.includedColumns || []), newColumn.id]
        };
      } else {
        console.log('Creating new analysis');
        const averageScore = aiResponse.scores.reduce((sum, score) => sum + (score.score || 0), 0) / aiResponse.scores.length;
        updatedAnalysis = {
          id: analysisId,
          criteriaColumns: [newColumn],
          marketSignalScore: Math.round(averageScore),
          createdAt: new Date(),
          includedColumns: [newColumn.id]
        };
      }

      console.log('Setting updated analysis');
      setCurrentAnalysis(updatedAnalysis);
      
      // Update state to completed
      const completedState = { ...analysisState, status: 'completed' as const };
      saveAnalysisState(completedState);
      
      // Clean up after success
      setTimeout(() => {
        clearAnalysisState();
      }, 2000);
      
      const actualDuration = Math.round((Date.now() - startTime) / 1000);
      console.log('Analysis completed in', actualDuration, 'seconds');
      
      toast({
        title: "Analysis Complete",
        description: `Successfully added "${aiResponse.suggested_title}" with ${aiResponse.scores.length} market scores.`,
      });

      console.log('=== RUN SCORING SUCCESS ===');
      return updatedAnalysis;
      
    } catch (err) {
      console.error('=== RUN SCORING ERROR ===');
      
      // Check if this was a cancellation
      if (err instanceof Error && (err.name === 'AbortError' || err.message.includes('cancelled'))) {
        console.log('Analysis was cancelled');
        return undefined;
      }

      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Territory scoring error:', errorMessage);
      setError(errorMessage);
      
      // Update state to failed
      const failedState = { ...analysisState, status: 'failed' as const };
      saveAnalysisState(failedState);
      
      // Provide helpful error feedback
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('timeout') || errorMessage.includes('took too long')) {
        userFriendlyMessage = `Analysis timed out. Try using Fast Analysis mode or simplifying your prompt.`;
      }
      
      toast({
        title: "Analysis Failed",
        description: userFriendlyMessage,
        variant: "destructive",
      });
      
      throw err;
    } finally {
      console.log('=== RUN SCORING CLEANUP ===');
      isProcessingRef.current = false;
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
      (startTime: number) => {
        setIsLoading(true);
        setAnalysisStartTime(startTime);
        const column = currentAnalysis.criteriaColumns.find(c => c.id === columnId);
        if (column) {
          setAnalysisMode(column.analysisMode || 'fast');
          const duration = estimateAnalysisDuration(column.prompt, cbsaData.length, column.analysisMode || 'fast');
          setEstimatedDuration(duration);
        }
      },
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
    console.log('Deleting column:', columnId);
    
    const updatedAnalysis = deleteColumnOperation(columnId, currentAnalysis);
    
    if (updatedAnalysis === null) {
      console.log('All columns deleted, clearing analysis');
      clearAnalysis();
    } else if (updatedAnalysis) {
      console.log('Setting updated analysis after column deletion');
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
      isProcessingRef.current = false;
    };
  }, []);

  return {
    isLoading: isLoading || !!refreshingColumnId,
    currentAnalysis,
    error,
    analysisStartTime: analysisStartTime || refreshStartTime,
    analysisMode,
    estimatedDuration,
    refreshingColumnId,
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
