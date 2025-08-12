
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
      // Helper: adaptively process a chunk, splitting if needed
      const processAdaptive = async (chunk: CBSAData[], label: string, chunkIndex: number): Promise<void> => {
        try {
          const { data, error } = await supabase.functions.invoke('territory-scoring', {
            body: {
              userPrompt: prompt,
              cbsaData: chunk.map(({ id, name, state, region, population, populationGrowth }) => ({ id, name, state, region, population, populationGrowth })),
              analysisMode: mode,
              isChunked: chunks.length > 1,
              chunkIndex,
              totalChunks: chunks.length
            }
          });

          if (error) {
            throw new Error(error.message || `Chunk ${label} failed`);
          }
          if (!data?.success) {
            throw new Error(data?.error || `Chunk ${label} returned failure`);
          }

          console.log(`Chunk ${label} completed successfully with ${data.data.scores?.length || 0} scores`);

          if (data.data.scores && Array.isArray(data.data.scores)) {
            allScores = [...allScores, ...data.data.scores];
          }
          if (chunkIndex === 0 && !combinedSummary && !suggestedTitle) {
            combinedSummary = data.data.prompt_summary || '';
            suggestedTitle = data.data.suggested_title || 'Analysis Results';
          }
        } catch (err) {
          console.warn(`Chunk ${label} error:`, err);
          // If too big or parsing error, split and retry
          if (chunk.length > 5) {
            const mid = Math.floor(chunk.length / 2);
            const first = chunk.slice(0, mid);
            const second = chunk.slice(mid);
            console.log(`Splitting chunk ${label} into ${label}a (${first.length}) and ${label}b (${second.length})`);
            await processAdaptive(first, `${label}a`, chunkIndex);
            await processAdaptive(second, `${label}b`, chunkIndex);
          } else {
            // Give up on very small chunks but continue overall processing
            console.error(`Chunk ${label} too small to split further; skipping these ${chunk.length} markets.`);
          }
        }
      };

      for (let idx = 0; idx < chunks.length; idx++) {
        const chunk = chunks[idx];
        console.log(`Processing chunk ${idx + 1}/${chunks.length} with ${chunk.length} markets`);

        // Check if request was aborted before processing each chunk
        if (analysisRequestRef.current?.signal.aborted) {
          console.log('Analysis was cancelled during chunk processing');
          throw new Error('Analysis was cancelled');
        }

        await processAdaptive(chunk, `${idx + 1}/${chunks.length}`, idx);

        if (chunks.length > 1) {
          toast({
            title: "Processing Markets",
            description: `Completed ${idx + 1} of ${chunks.length} chunks (${new Set(allScores.map((s: any) => (typeof s?.market === 'string' ? s.market.trim().toLowerCase() : ''))).size}/${cbsaData.length} markets scored)`,
          });
        }
      }

      // Deduplicate scores by market name to avoid double counting
      if (allScores.length > 0) {
        const seen = new Set<string>();
        allScores = allScores.filter((item: any) => {
          const key = typeof item?.market === 'string' ? item.market.trim().toLowerCase() : '';
          if (!key) return false;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
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
