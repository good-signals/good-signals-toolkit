import React, { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/integrations/supabase/client';
import { TerritoryAnalysis, CBSAData, ColumnToggleSettings, ManualScoreOverride } from '@/types/territoryTargeterTypes';
import { useAnalysisState } from '@/hooks/territory-targeter/useAnalysisState';
import { useExecutiveSummary } from '@/hooks/territory-targeter/useExecutiveSummary';
import { useColumnSettings } from '@/hooks/territory-targeter/useColumnSettings';
import { useManualScoreOverrides } from '@/hooks/territory-targeter/useManualScoreOverrides';
import { useAccountSettings } from '@/hooks/territory-targeter/useAccountSettings';
import { exportTerritoryAnalysisToCSV, exportTerritoryAnalysisToExcel } from '@/services/territoryExportService';
import TerritoryHeader from './TerritoryHeader';
import PromptInput from './PromptInput';
import TerritoryResultsSection from './TerritoryResultsSection';
import CBSATable from './CBSATable';
import TerritoryNotices from './TerritoryNotices';
import SignalSettingsNotice from './SignalSettingsNotice';
import ProgressCounter from './ProgressCounter';

const TerritoryTargeterPageContent: React.FC = () => {
  const { user } = useUser();
  const { currentAnalysis, setCurrentAnalysis, clearAnalysis } = useAnalysisState();
  const { executiveSummary, setExecutiveSummary, isGeneratingSummary, handleGenerateExecutiveSummary, handleUpdateExecutiveSummary } = useExecutiveSummary(currentAnalysis, user);
  const { columnSettings, toggleColumn, deleteColumn } = useColumnSettings(currentAnalysis);
  const { manualScoreOverrides, addManualOverride, removeManualOverride } = useManualScoreOverrides();
  const { currentAccount, accountGoodThreshold, accountBadThreshold } = useAccountSettings(user?.id);

  const [isProcessing, setIsProcessing] = useState(false);
  const [cbsaData, setCBSAData] = useState<CBSAData[]>([]);
  const [prompt, setPrompt] = useState('');

  const handlePromptSubmit = async (newPrompt: string, mode: 'fast' | 'detailed') => {
    if (isProcessing) return;

    setPrompt(newPrompt);
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('initiate-territory-analysis', {
        body: { prompt: newPrompt, mode, userId: user?.id }
      });

      if (error) {
        throw new Error(`Failed to initiate analysis: ${error.message}`);
      }

      if (!data || !data.analysisId) {
        throw new Error('Analysis initiation did not return an analysis ID.');
      }

      // Optimistically update the analysis state
      setCurrentAnalysis({
        id: data.analysisId,
        criteriaColumns: [],
        marketSignalScore: 0,
        createdAt: new Date(),
        includedColumns: []
      });

      // Fetch CBSA data
      const cbsaResponse = await supabase.functions.invoke('get-cbsa-data', {
        body: { analysisId: data.analysisId }
      });

      if (cbsaResponse.error) {
        throw new Error(`Failed to fetch CBSA data: ${cbsaResponse.error.message}`);
      }

      if (!cbsaResponse.data || !cbsaResponse.data.cbsa_data) {
        throw new Error('CBSA data fetch did not return any data.');
      }

      setCBSAData(cbsaResponse.data.cbsa_data);

      toast({
        title: "Analysis Initiated",
        description: "Your territory analysis has been initiated and is running in the background.",
      });

    } catch (err) {
      console.error('Failed to initiate territory analysis:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';

      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
      clearAnalysis();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleColumn = (columnId: string, included: boolean) => {
    toggleColumn(columnId, included);
    if (currentAnalysis) {
      const updatedAnalysis: TerritoryAnalysis = {
        ...currentAnalysis,
        includedColumns: included
          ? [...(currentAnalysis.includedColumns || []), columnId]
          : (currentAnalysis.includedColumns || []).filter(id => id !== columnId)
      };
      setCurrentAnalysis(updatedAnalysis);
    }
  };

  const handleDeleteColumn = (columnId: string) => {
    deleteColumn(columnId);
    if (currentAnalysis) {
      const updatedAnalysis: TerritoryAnalysis = {
        ...currentAnalysis,
        criteriaColumns: currentAnalysis.criteriaColumns.filter(col => col.id !== columnId)
      };
      setCurrentAnalysis(updatedAnalysis);
    }
  };

  const handleClearAnalysis = () => {
    clearAnalysis();
    setCBSAData([]);
  };

  const handleExportCSV = () => {
    if (!currentAnalysis) {
      toast({
        title: "No Analysis Available",
        description: "Please run an analysis before exporting data.",
        variant: "destructive",
      });
      return;
    }

    exportTerritoryAnalysisToCSV({
      cbsaData: cbsaData,
      scores: currentAnalysis.criteriaColumns.flatMap(column => column.scores),
      analysis: currentAnalysis,
      executiveSummary: executiveSummary
    });
  };

  const handleExportExcel = () => {
    if (!currentAnalysis) {
      toast({
        title: "No Analysis Available",
        description: "Please run an analysis before exporting data.",
        variant: "destructive",
      });
      return;
    }

    exportTerritoryAnalysisToExcel({
      cbsaData: cbsaData,
      scores: currentAnalysis.criteriaColumns.flatMap(column => column.scores),
      analysis: currentAnalysis,
      executiveSummary: executiveSummary
    });
  };

  const handleManualOverride = (override: ManualScoreOverride) => {
    if (override.score === null) {
      removeManualOverride(override.marketName, override.columnId);
    } else {
      addManualOverride(override);
    }

    // Update the currentAnalysis state with the manual override
    if (currentAnalysis) {
      const updatedAnalysis: TerritoryAnalysis = {
        ...currentAnalysis,
        criteriaColumns: currentAnalysis.criteriaColumns.map(column => {
          if (column.id === override.columnId) {
            return {
              ...column,
              scores: column.scores.map(score => {
                if (score.market === override.marketName) {
                  return {
                    ...score,
                    score: override.score,
                    reasoning: override.reasoning
                  };
                }
                return score;
              })
            };
          }
          return column;
        })
      };
      setCurrentAnalysis(updatedAnalysis);
    }
  };

  const handleStatusChange = async (cbsaId: string, newStatus: string) => {
    try {
      // Update local state optimistically
      setCBSAData(prevData =>
        prevData.map(cbsa =>
          cbsa.id === cbsaId ? { ...cbsa, status: newStatus as any } : cbsa
        )
      );

      toast({
        title: "Status Updated",
        description: `CBSA status updated to ${newStatus}.`,
      });

    } catch (err) {
      console.error('Failed to update CBSA status:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';

      toast({
        title: "Status Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <TerritoryHeader />
        
        <div className="max-w-4xl mx-auto space-y-6">
          <TerritoryNotices 
            user={user}
            cbsaDataLength={cbsaData.length || 100}
          />
          <SignalSettingsNotice 
            currentAccount={currentAccount}
            accountGoodThreshold={accountGoodThreshold}
            accountBadThreshold={accountBadThreshold}
          />
          
          <PromptInput 
            isLoading={isProcessing}
            onSubmit={handlePromptSubmit}
          />

          {currentAnalysis && cbsaData.length > 0 && (
            <TerritoryResultsSection
              currentAnalysis={currentAnalysis}
              cbsaData={cbsaData}
              executiveSummary={executiveSummary}
              isGeneratingSummary={isGeneratingSummary}
              onGenerateSummary={() => handleGenerateExecutiveSummary(cbsaData)}
              onUpdateSummary={handleUpdateExecutiveSummary}
              onToggleColumn={handleToggleColumn}
              onDeleteColumn={handleDeleteColumn}
              onClearAnalysis={handleClearAnalysis}
              onExportCSV={handleExportCSV}
              onExportExcel={handleExportExcel}
            />
          )}

          {currentAnalysis && cbsaData.length > 0 && (
            <CBSATable 
              cbsaData={cbsaData}
              criteriaColumns={currentAnalysis.criteriaColumns}
              marketSignalScore={currentAnalysis.marketSignalScore}
              accountGoodThreshold={accountGoodThreshold}
              accountBadThreshold={accountBadThreshold}
              onManualScoreOverride={handleManualOverride}
              onStatusChange={handleStatusChange}
            />
          )}

          {isProcessing && currentAnalysis && (
            <ProgressCounter 
              isActive={isProcessing}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TerritoryTargeterPageContent;
