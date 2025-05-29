
import { useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CBSAData, AIScoreResponse } from '@/types/territoryTargeterTypes';
import { toast } from '@/hooks/use-toast';

export const useAnalysisProcessing = () => {
  const analysisRequestRef = useRef<AbortController | null>(null);

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
      
      // Check if request was aborted before processing each chunk
      if (analysisRequestRef.current?.signal.aborted) {
        throw new Error('Analysis was cancelled');
      }
      
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

    return await processMarketsInChunks(prompt, cbsaData, analysisId, 'fast');
  };

  const cancelAnalysis = () => {
    console.log('Cancelling territory analysis...');
    
    // Abort the current request
    if (analysisRequestRef.current) {
      analysisRequestRef.current.abort();
      analysisRequestRef.current = null;
    }
  };

  return {
    analysisRequestRef,
    processMarketsInChunks,
    retryWithSimpleAnalysis,
    cancelAnalysis
  };
};
