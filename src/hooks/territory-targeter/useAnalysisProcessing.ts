
import { useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CBSAData, AIScoreResponse } from '@/types/territoryTargeterTypes';
import { toast } from '@/hooks/use-toast';

export const useAnalysisProcessing = () => {
  const analysisRequestRef = useRef<AbortController | null>(null);

  // Process markets in chunks with improved error handling
  const processMarketsInChunks = async (prompt: string, cbsaData: CBSAData[], analysisId: string, mode: 'fast' | 'detailed') => {
    console.log('=== CHUNK PROCESSING START ===');
    const chunkSize = mode === 'fast' ? 50 : 30;
    const chunks = [];
    
    for (let i = 0; i < cbsaData.length; i += chunkSize) {
      chunks.push(cbsaData.slice(i, i + chunkSize));
    }

    console.log(`Processing ${cbsaData.length} markets in ${chunks.length} chunks of ~${chunkSize} markets each`);
    
    let allScores: any[] = [];
    let combinedSummary = '';
    let suggestedTitle = '';

    // Set more reasonable timeouts
    const timeoutDuration = mode === 'fast' ? 8 * 60 * 1000 : 12 * 60 * 1000; // 8 or 12 minutes
    const timeoutId = setTimeout(() => {
      if (analysisRequestRef.current) {
        analysisRequestRef.current.abort();
        console.log('Analysis timed out and was aborted');
      }
    }, timeoutDuration);

    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`Processing chunk ${i + 1}/${chunks.length} with ${chunk.length} markets`);
        
        // Check if request was aborted before processing each chunk
        if (analysisRequestRef.current?.signal.aborted) {
          console.log('Analysis was cancelled during chunk processing');
          throw new Error('Analysis was cancelled');
        }
        
        try {
          const { data, error } = await supabase.functions.invoke('territory-scoring', {
            body: {
              userPrompt: prompt,
              cbsaData: chunk,
              analysisMode: mode,
              isChunked: chunks.length > 1,
              chunkIndex: i,
              totalChunks: chunks.length
            },
            signal: analysisRequestRef.current?.signal
          });

          if (error) {
            console.error(`Chunk ${i + 1} error:`, error);
            // Don't throw immediately for single chunk failures, try to continue
            if (chunks.length === 1) {
              throw new Error(`Analysis failed: ${error.message}`);
            } else {
              console.log(`Chunk ${i + 1} failed, continuing with remaining chunks...`);
              continue;
            }
          }

          if (!data?.success) {
            console.error(`Chunk ${i + 1} returned failure:`, data?.error);
            if (chunks.length === 1) {
              throw new Error(`Analysis returned error: ${data?.error || 'Unknown error'}`);
            } else {
              console.log(`Chunk ${i + 1} failed, continuing with remaining chunks...`);
              continue;
            }
          }

          console.log(`Chunk ${i + 1} completed successfully with ${data.data.scores?.length || 0} scores`);
          
          if (data.data.scores && Array.isArray(data.data.scores)) {
            allScores = [...allScores, ...data.data.scores];
          }
          
          if (i === 0) {
            combinedSummary = data.data.prompt_summary || '';
            suggestedTitle = data.data.suggested_title || 'Analysis Results';
          }

          if (chunks.length > 1) {
            toast({
              title: "Processing Markets",
              description: `Completed ${i + 1} of ${chunks.length} chunks (${allScores.length}/${cbsaData.length} markets scored)`,
            });
          }
        } catch (chunkError) {
          console.error(`Chunk ${i + 1} processing failed:`, chunkError);
          
          // If it's a cancellation, re-throw it
          if (chunkError instanceof Error && (chunkError.message.includes('cancelled') || chunkError.message.includes('abort'))) {
            throw chunkError;
          }
          
          // For single chunk operations, throw the error
          if (chunks.length === 1) {
            throw chunkError;
          }
          
          // For multi-chunk operations, log and continue
          console.log(`Continuing processing despite chunk ${i + 1} failure...`);
        }
      }

      // Clear the timeout since we completed successfully
      clearTimeout(timeoutId);

      if (allScores.length === 0) {
        throw new Error('No market scores were generated. Please try again with a simpler prompt.');
      }

      const result = {
        suggested_title: suggestedTitle,
        prompt_summary: combinedSummary,
        scores: allScores
      };

      console.log('=== CHUNK PROCESSING SUCCESS ===');
      return result as AIScoreResponse;

    } catch (error) {
      console.error('=== CHUNK PROCESSING ERROR ===');
      clearTimeout(timeoutId);
      
      if (error instanceof Error && (error.message.includes('cancelled') || error.message.includes('abort'))) {
        console.log('Chunk processing was cancelled');
      }
      
      throw error;
    }
  };

  // Retry with simpler analysis if detailed fails
  const retryWithSimpleAnalysis = async (prompt: string, cbsaData: CBSAData[], analysisId: string) => {
    console.log('=== RETRY WITH FAST ANALYSIS ===');
    console.log('Retrying with fast analysis mode after failure...');
    
    toast({
      title: "Switching to Fast Analysis",
      description: "Detailed analysis failed. Trying with faster mode...",
    });

    try {
      const result = await processMarketsInChunks(prompt, cbsaData, analysisId, 'fast');
      console.log('Fast analysis retry successful');
      return result;
    } catch (retryError) {
      console.error('Fast analysis retry also failed:', retryError);
      throw new Error(`Both detailed and fast analysis failed. ${retryError instanceof Error ? retryError.message : 'Please try again with a simpler prompt.'}`);
    }
  };

  const cancelAnalysis = () => {
    console.log('Cancelling territory analysis...');
    
    // Abort the current request
    if (analysisRequestRef.current) {
      analysisRequestRef.current.abort();
      analysisRequestRef.current = null;
      console.log('Analysis request aborted');
    }
  };

  return {
    analysisRequestRef,
    processMarketsInChunks,
    retryWithSimpleAnalysis,
    cancelAnalysis
  };
};
