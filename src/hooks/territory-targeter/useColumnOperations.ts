
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CBSAData, ManualScoreOverride, TerritoryAnalysis } from '@/types/territoryTargeterTypes';
import { toast } from '@/hooks/use-toast';

export const useColumnOperations = () => {
  const [refreshingColumnId, setRefreshingColumnId] = useState<string | null>(null);
  const [refreshStartTime, setRefreshStartTime] = useState<number | null>(null);

  const refreshColumn = async (
    columnId: string, 
    type: 'all' | 'na-only', 
    cbsaData: CBSAData[], 
    currentAnalysis: TerritoryAnalysis,
    onRefreshStart?: (startTime: number) => void,
    onRefreshEnd?: () => void
  ) => {
    if (!currentAnalysis) return;

    const column = currentAnalysis.criteriaColumns.find(c => c.id === columnId);
    if (!column) return;

    setRefreshingColumnId(columnId);
    const startTime = Date.now();
    setRefreshStartTime(startTime);
    
    // Notify parent component about refresh start
    if (onRefreshStart) {
      onRefreshStart(startTime);
    }
    
    try {
      // Import market name matching utility
      const { findMarketMatch } = await import('@/services/marketNameMatcher');
      const availableMarketNames = cbsaData.map(cbsa => cbsa.name);
      
      // Determine which markets to refresh using intelligent matching
      let marketsToRefresh = cbsaData;
      if (type === 'na-only') {
        // Find markets that have N/A scores in this column using smart matching
        const naMarkets = cbsaData.filter(cbsa => {
          // Try exact match first
          let score = column.scores.find(s => s.market === cbsa.name);
          
          // If no exact match, try intelligent matching
          if (!score) {
            const naMatchResult = findMarketMatch(cbsa.name, { 
              availableMarkets: column.scores.map(s => s.market),
              threshold: 0.9,
              enableFuzzy: true,
              enableKeyword: true
            });
            
            if (naMatchResult.matched) {
              score = column.scores.find(s => s.market === naMatchResult.normalizedMarketName);
              console.log(`🎯 Market name match found: "${cbsa.name}" → "${naMatchResult.normalizedMarketName}" (${naMatchResult.matchType}, confidence: ${naMatchResult.confidence})`);
            } else {
              console.log(`⚠️ No match found for market: "${cbsa.name}". Available scores for: ${column.scores.map(s => s.market).join(', ')}`);
            }
          }
          
          return !score || score.score === null || score.score === undefined;
        });
        marketsToRefresh = naMarkets;
        
        console.log(`🔄 Refresh analysis for column "${column.title}":`);
        console.log(`   Markets to refresh: ${marketsToRefresh.length}/${cbsaData.length}`);
        console.log(`   Markets needing refresh: ${marketsToRefresh.map(m => m.name).join(', ')}`);
      }

      if (marketsToRefresh.length === 0) {
        toast({
          title: "No Markets to Refresh",
          description: "All markets already have scores for this criteria.",
        });
        return currentAnalysis;
      }

      // Show initial toast with progress feedback
      toast({
        title: "Refreshing Column",
        description: `Starting refresh for ${marketsToRefresh.length} markets in "${column.title}"...`,
      });

      // Run analysis for the specified markets
      const { data, error } = await supabase.functions.invoke('territory-scoring', {
        body: {
          userPrompt: column.prompt,
          cbsaData: marketsToRefresh,
          analysisMode: column.analysisMode || 'detailed'
        }
      });

      if (error) {
        throw new Error(`Refresh failed: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred during refresh');
      }

      // Update the column with new scores using intelligent matching
      const updatedColumn = { ...column };
      
      let successfulUpdates = 0;
      let totalNewScores = data.data.scores.length;
      
      data.data.scores.forEach((newScore: any) => {
        // Try exact match first
        let existingIndex = updatedColumn.scores.findIndex(s => s.market === newScore.market);
        let targetMarketName = newScore.market;
        let responseMatchResult = null;
        
        // If no exact match, try intelligent matching
        if (existingIndex === -1) {
          responseMatchResult = findMarketMatch(newScore.market, {
            availableMarkets: availableMarketNames,
            threshold: 0.8,
            enableFuzzy: true,
            enableKeyword: true
          });
          
          if (responseMatchResult.matched) {
            targetMarketName = responseMatchResult.normalizedMarketName;
            existingIndex = updatedColumn.scores.findIndex(s => s.market === targetMarketName);
            console.log(`🎯 AI response market name matched: "${newScore.market}" → "${targetMarketName}" (${responseMatchResult.matchType}, confidence: ${responseMatchResult.confidence})`);
          } else {
            console.warn(`⚠️ Could not match AI response market "${newScore.market}" to any available market. Suggestions: ${responseMatchResult.suggestions?.join(', ') || 'none'}`);
          }
        }
        
        // Update or add the score
        const scoreToUpdate = {
          ...newScore,
          market: targetMarketName
        };
        
        if (existingIndex !== -1) {
          updatedColumn.scores[existingIndex] = scoreToUpdate;
          successfulUpdates++;
        } else if (responseMatchResult?.matched) {
          updatedColumn.scores.push(scoreToUpdate);
          successfulUpdates++;
        }
      });
      
      console.log(`✅ Column refresh completed: ${successfulUpdates}/${totalNewScores} scores successfully updated`);
      
      if (successfulUpdates === 0) {
        throw new Error(`No scores could be matched to available markets. This may indicate a data format issue.`);
      }

      // Update the analysis
      const updatedAnalysis = {
        ...currentAnalysis,
        criteriaColumns: currentAnalysis.criteriaColumns.map(c => 
          c.id === columnId ? updatedColumn : c
        )
      };

      toast({
        title: "Column Refreshed",
        description: `Successfully refreshed ${marketsToRefresh.length} markets for "${column.title}".`,
      });

      return updatedAnalysis;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Column refresh error:', errorMessage);
      
      toast({
        title: "Refresh Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      return currentAnalysis;
    } finally {
      setRefreshingColumnId(null);
      setRefreshStartTime(null);
      
      // Notify parent component about refresh end
      if (onRefreshEnd) {
        onRefreshEnd();
      }
    }
  };

  const applyManualOverride = (override: ManualScoreOverride, currentAnalysis: TerritoryAnalysis) => {
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

    toast({
      title: "Score Updated",
      description: `Manual override applied for ${override.marketName}.`,
    });

    return updatedAnalysis;
  };

  const toggleColumnInSignalScore = (columnId: string, included: boolean, currentAnalysis: TerritoryAnalysis) => {
    if (!currentAnalysis) return;

    const updatedAnalysis = {
      ...currentAnalysis,
      criteriaColumns: currentAnalysis.criteriaColumns.map(column =>
        column.id === columnId
          ? { ...column, isIncludedInSignalScore: included }
          : column
      )
    };

    toast({
      title: included ? "Column Included" : "Column Excluded",
      description: `${currentAnalysis.criteriaColumns.find(c => c.id === columnId)?.title} ${included ? 'included in' : 'excluded from'} Market Signal Score calculation.`,
    });

    return updatedAnalysis;
  };

  const deleteColumn = (columnId: string, currentAnalysis: TerritoryAnalysis) => {
    if (!currentAnalysis) return;

    const columnToDelete = currentAnalysis.criteriaColumns.find(c => c.id === columnId);
    if (!columnToDelete) return;

    const updatedAnalysis = {
      ...currentAnalysis,
      criteriaColumns: currentAnalysis.criteriaColumns.filter(column => column.id !== columnId),
      includedColumns: currentAnalysis.includedColumns.filter(id => id !== columnId)
    };

    toast({
      title: "Column Deleted",
      description: `"${columnToDelete.title}" has been removed from the analysis.`,
    });

    // If no columns left, return null to indicate analysis should be cleared
    return updatedAnalysis.criteriaColumns.length === 0 ? null : updatedAnalysis;
  };

  const renameColumn = (columnId: string, newTitle: string, currentAnalysis: TerritoryAnalysis) => {
    if (!currentAnalysis) return;

    const trimmed = (newTitle || '').trim();
    if (!trimmed) {
      toast({
        title: "Invalid Title",
        description: "Please enter a non-empty title.",
        variant: "destructive",
      });
      return currentAnalysis;
    }

    const exists = currentAnalysis.criteriaColumns.some(c => c.title === trimmed && c.id !== columnId);
    const updatedAnalysis = {
      ...currentAnalysis,
      criteriaColumns: currentAnalysis.criteriaColumns.map(c =>
        c.id === columnId ? { ...c, title: trimmed } : c
      )
    };

    toast({
      title: "Column Renamed",
      description: exists
        ? `Title updated to "${trimmed}" (duplicate titles are allowed).`
        : `Title updated to "${trimmed}".`,
    });

    return updatedAnalysis;
  };

  return {
    refreshingColumnId,
    refreshStartTime,
    refreshColumn,
    applyManualOverride,
    toggleColumnInSignalScore,
    deleteColumn,
    renameColumn
  };
};
