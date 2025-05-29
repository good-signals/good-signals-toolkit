
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/useUser';
import { TerritoryAnalysis, CBSAData, ColumnToggleSettings, ManualScoreOverride } from '@/types/territoryTargeterTypes';
import { useAnalysisState } from '@/hooks/territory-targeter/useAnalysisState';
import { useExecutiveSummary } from '@/hooks/territory-targeter/useExecutiveSummary';
import { useColumnSettings } from '@/hooks/territory-targeter/useColumnSettings';
import { useManualScoreOverrides } from '@/hooks/territory-targeter/useManualScoreOverrides';
import { useAccountSettings } from '@/hooks/territory-targeter/useAccountSettings';
import { useTerritoryScoring } from '@/hooks/useTerritoryScoring';
import { exportTerritoryAnalysisToCSV, exportTerritoryAnalysisToExcel } from '@/services/territoryExportService';
import { sampleCBSAData } from '@/data/sampleCBSAData';
import TerritoryHeader from './TerritoryHeader';
import PromptInput from './PromptInput';
import TerritoryResultsSection from './TerritoryResultsSection';
import CBSATable from './CBSATable';
import TerritoryNotices from './TerritoryNotices';
import SignalSettingsNotice from './SignalSettingsNotice';

const TerritoryTargeterPageContent: React.FC = () => {
  const { user } = useUser();
  const { currentAnalysis, setCurrentAnalysis, storedCBSAData, setCBSAData, clearAnalysis } = useAnalysisState();
  const { executiveSummary, setExecutiveSummary, isGeneratingSummary, handleGenerateExecutiveSummary, handleUpdateExecutiveSummary } = useExecutiveSummary(currentAnalysis, user);
  const { columnSettings, toggleColumn, deleteColumn } = useColumnSettings(currentAnalysis);
  const { manualScoreOverrides, addManualOverride, removeManualOverride } = useManualScoreOverrides();
  const { currentAccount, accountGoodThreshold, accountBadThreshold } = useAccountSettings(user?.id);
  
  // Use the existing useTerritoryScoring hook
  const {
    isLoading: isProcessing,
    runScoring,
    refreshColumn,
    applyManualOverride,
    refreshingColumnId,
    analysisStartTime,
    analysisMode,
    estimatedDuration,
    cancelAnalysis
  } = useTerritoryScoring();

  const [cbsaData, setCBSADataLocal] = useState<CBSAData[]>([]);
  const [isRestoringData, setIsRestoringData] = useState(false);

  // Initialize CBSA data from stored data or fallback to sample data
  useEffect(() => {
    if (currentAnalysis && storedCBSAData.length > 0) {
      console.log('Restoring CBSA data from storage:', storedCBSAData.length, 'items');
      setCBSADataLocal(storedCBSAData);
    } else if (currentAnalysis && storedCBSAData.length === 0) {
      console.log('No stored CBSA data found, using sample data as fallback');
      setIsRestoringData(true);
      setCBSADataLocal(sampleCBSAData);
      setCBSAData(sampleCBSAData);
      setIsRestoringData(false);
      
      toast({
        title: "Analysis Restored",
        description: "Your saved analysis has been restored with sample market data.",
      });
    } else if (!currentAnalysis) {
      // If no analysis, start with sample data
      setCBSADataLocal(sampleCBSAData);
    }
  }, [currentAnalysis, storedCBSAData, setCBSAData]);

  // Debug logging for analysis state
  useEffect(() => {
    console.log('Territory Targeter - Current Analysis:', currentAnalysis);
    console.log('Territory Targeter - CBSA Data Length:', cbsaData.length);
    console.log('Territory Targeter - Stored CBSA Data Length:', storedCBSAData.length);
    console.log('Territory Targeter - Executive Summary:', executiveSummary);
  }, [currentAnalysis, cbsaData, storedCBSAData, executiveSummary]);

  const handlePromptSubmit = async (newPrompt: string, mode: 'fast' | 'detailed') => {
    if (isProcessing) return;

    try {
      // Use the existing useTerritoryScoring hook to run the analysis
      const updatedAnalysis = await runScoring(newPrompt, cbsaData, mode);
      
      if (updatedAnalysis) {
        // Store the CBSA data if we have an analysis
        setCBSAData(cbsaData);
        
        toast({
          title: "Analysis Complete",
          description: "Your territory analysis has been completed successfully.",
        });
      }

    } catch (err) {
      console.error('Failed to run territory analysis:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';

      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
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
    setCBSADataLocal(sampleCBSAData);
    
    toast({
      title: "Analysis Cleared",
      description: "Your territory analysis has been cleared successfully.",
    });
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

    // Apply the override using the useTerritoryScoring hook
    applyManualOverride(override);
  };

  const handleRefreshColumn = (columnId: string, type: 'all' | 'na-only') => {
    if (currentAnalysis) {
      refreshColumn(columnId, type, cbsaData);
    }
  };

  const handleStatusChange = async (cbsaId: string, newStatus: string) => {
    try {
      // Update local state optimistically
      setCBSADataLocal(prevData =>
        prevData.map(cbsa =>
          cbsa.id === cbsaId ? { ...cbsa, status: newStatus as any } : cbsa
        )
      );

      // Also update stored data
      setCBSAData(cbsaData.map(cbsa =>
        cbsa.id === cbsaId ? { ...cbsa, status: newStatus as any } : cbsa
      ));

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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <TerritoryHeader />
        
        <div className="mx-auto space-y-6">
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
            onCancel={cancelAnalysis}
            analysisStartTime={analysisStartTime}
            analysisMode={analysisMode}
            estimatedDuration={estimatedDuration}
            hasExistingAnalysis={!!currentAnalysis}
          />

          {/* Show analysis results even if data is partially missing */}
          {currentAnalysis && (
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
              onRefreshColumn={handleRefreshColumn}
              refreshingColumnId={refreshingColumnId}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TerritoryTargeterPageContent;
