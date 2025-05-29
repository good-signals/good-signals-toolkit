
import { useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CBSAData, AIScoreResponse } from '@/types/territoryTargeterTypes';
import { toast } from '@/hooks/use-toast';

export const useAnalysisProcessing = () => {
  const analysisRequestRef = useRef<AbortController | null>(null);

  // Process markets in chunks to avoid timeouts
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

    // Set a timeout for the entire chunked operation
    const timeoutDuration = mode === 'fast' ? 10 * 60 * 1000 : 15 * 60 * 1000; // 10 or 15 minutes
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Analysis timed out after ${timeoutDuration / 60000} minutes. Try using Fast Analysis mode or simplifying your prompt.`));
      }, timeoutDuration);
    });

    try {
      const processingPromise = (async () => {
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
              }
            });

            if (error) {
              console.error(`Chunk ${i + 1} error:`, error);
              throw new Error(`Chunk ${i + 1} failed: ${error.message}`);
            }

            if (!data.success) {
              console.error(`Chunk ${i + 1} returned failure:`, data.error);
              throw new Error(`Chunk ${i + 1} returned error: ${data.error}`);
            }

            console.log(`Chunk ${i + 1} completed successfully with ${data.data.scores.length} scores`);
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
          } catch (chunkError) {
            console.error(`Chunk ${i + 1} processing failed:`, chunkError);
            
            // If it's a cancellation, re-throw it
            if (chunkError instanceof Error && (chunkError.message.includes('cancelled') || chunkError.message.includes('abort'))) {
              throw chunkError;
            }
            
            // For other errors, provide more context
            const errorMessage = chunkError instanceof Error ? chunkError.message : 'Unknown error';
            throw new Error(`Failed to process chunk ${i + 1}/${chunks.length}: ${errorMessage}`);
          }
        }

        return {
          suggested_title: suggestedTitle,
          prompt_summary: combinedSummary,
          scores: allScores
        };
      })();

      // Race between processing and timeout
      const result = await Promise.race([processingPromise, timeoutPromise]);
      console.log('=== CHUNK PROCESSING SUCCESS ===');
      return result as AIScoreResponse;

    } catch (error) {
      console.error('=== CHUNK PROCESSING ERROR ===');
      console.error('Error:', error);
      
      if (error instanceof Error && error.message.includes('timed out')) {
        console.log('Chunk processing timed out');
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
