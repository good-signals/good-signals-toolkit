
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { safeStorage } from '@/utils/safeStorage';
import { TerritoryAnalysis, CBSAData } from '@/types/territoryTargeterTypes';

const EXECUTIVE_SUMMARY_STORAGE_KEY = 'territoryTargeter_executiveSummary';

export const useExecutiveSummary = (currentAnalysis: TerritoryAnalysis | null, user: any) => {
  const [executiveSummary, setExecutiveSummary] = useState<string>(() => {
    // Load saved executive summary from localStorage
    const saved = safeStorage.getItem(EXECUTIVE_SUMMARY_STORAGE_KEY);
    return saved || '';
  });
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Save executive summary to localStorage whenever it changes
  useEffect(() => {
    if (executiveSummary) {
      safeStorage.setItem(EXECUTIVE_SUMMARY_STORAGE_KEY, executiveSummary);
    } else {
      safeStorage.removeItem(EXECUTIVE_SUMMARY_STORAGE_KEY);
    }
  }, [executiveSummary]);

  // Clear executive summary when analysis is cleared
  useEffect(() => {
    if (!currentAnalysis) {
      setExecutiveSummary('');
    }
  }, [currentAnalysis]);

  const handleGenerateExecutiveSummary = async (cbsaData: CBSAData[]) => {
    if (!currentAnalysis || !user) return;

    setIsGeneratingSummary(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-territory-summary', {
        body: {
          analysis: currentAnalysis,
          cbsaData: cbsaData,
          topMarketCount: 8
        }
      });

      if (error) {
        throw new Error(`Failed to generate executive summary: ${error.message}`);
      }

      if (!data || !data.executiveSummary) {
        throw new Error('Executive summary generation did not return content.');
      }

      setExecutiveSummary(data.executiveSummary);
      
      toast({
        title: "Executive Summary Generated",
        description: "AI-powered executive summary has been created for your territory analysis.",
      });

    } catch (err) {
      console.error('Failed to generate executive summary:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      
      toast({
        title: "Summary Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  return {
    executiveSummary,
    setExecutiveSummary,
    isGeneratingSummary,
    handleGenerateExecutiveSummary
  };
};
