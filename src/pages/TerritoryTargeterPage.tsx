
import React, { useState, useEffect } from 'react';
import { CBSAData } from '@/types/territoryTargeterTypes';
import { useCBSAStatus } from '@/hooks/territory-targeter/useCBSAStatus';
import { useTerritoryScoring } from '@/hooks/useTerritoryScoring';
import { useExecutiveSummary } from '@/hooks/territory-targeter/useExecutiveSummary';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountSettings } from '@/hooks/territory-targeter/useAccountSettings';
import TerritoryTargeterErrorBoundary from '@/components/territory-targeter/TerritoryTargeterErrorBoundary';
import TerritoryHeader from '@/components/territory-targeter/TerritoryHeader';
import PromptInput from '@/components/territory-targeter/PromptInput';
import TerritoryNotices from '@/components/territory-targeter/TerritoryNotices';
import ProgressCounter from '@/components/territory-targeter/ProgressCounter';
import FinalExecutiveSummary from '@/components/territory-targeter/FinalExecutiveSummary';
import ExecutiveSummary from '@/components/territory-targeter/ExecutiveSummary';
import ColumnManagement from '@/components/territory-targeter/ColumnManagement';
import ExportControls from '@/components/territory-targeter/ExportControls';
import CBSATable from '@/components/territory-targeter/CBSATable';
import ErrorDisplay from '@/components/territory-targeter/ErrorDisplay';
import { exportTerritoryAnalysisToCSV, exportTerritoryAnalysisToExcel } from '@/services/territoryExportService';
import { toast } from '@/hooks/use-toast';

const TerritoryTargeterPageContent: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [analysisMode, setAnalysisMode] = useState<'manual' | 'ai'>('ai');
  const [scoringMode, setScoringMode] = useState<'fast' | 'detailed'>('fast');

  const { user } = useAuth();
  const { cbsaData, isInitialized, handleStatusChange } = useCBSAStatus();
  const { accountGoodThreshold, accountBadThreshold, refreshThresholds } = useAccountSettings(user?.id);

  // Refresh thresholds when the page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page became visible, refreshing thresholds...');
        refreshThresholds();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshThresholds]);

  const {
    isLoading,
    currentAnalysis,
    error,
    analysisStartTime,
    estimatedDuration,
    refreshingColumnId,
    runScoring,
    cancelAnalysis,
    refreshColumn,
    applyManualOverride,
    toggleColumnInSignalScore,
    deleteColumn,
    clearAnalysis,
    setAnalysisMode: setScoringAnalysisMode,
    renameColumn
  } = useTerritoryScoring();

  const {
    executiveSummary,
    isGeneratingSummary,
    handleGenerateExecutiveSummary,
    handleUpdateExecutiveSummary
  } = useExecutiveSummary(currentAnalysis, user);

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter a description of the markets you want to analyze.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use the Territory Targeter.",
        variant: "destructive",
      });
      return;
    }

    try {
      setScoringAnalysisMode(scoringMode);
      await runScoring(prompt, cbsaData, scoringMode);
    } catch (error) {
      console.error('Territory analysis failed:', error);
    }
  };

  const handleClearAnalysis = () => {
    clearAnalysis();
    setPrompt('');
  };

  const handleExportCSV = async () => {
    try {
      if (!currentAnalysis) {
        toast({
          title: "No Analysis Data",
          description: "Please run an analysis before exporting.",
          variant: "destructive",
        });
        return;
      }

      await exportTerritoryAnalysisToCSV({
        cbsaData,
        scores: [],
        analysis: currentAnalysis,
        executiveSummary
      });
      
      toast({
        title: "Export Successful",
        description: "Territory analysis data exported to CSV.",
      });
    } catch (error) {
      console.error('CSV export failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export territory analysis data.",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = async () => {
    try {
      if (!currentAnalysis) {
        toast({
          title: "No Analysis Data",
          description: "Please run an analysis before exporting.",
          variant: "destructive",
        });
        return;
      }

      await exportTerritoryAnalysisToExcel({
        cbsaData,
        scores: [],
        analysis: currentAnalysis,
        executiveSummary
      });
      
      toast({
        title: "Export Successful", 
        description: "Territory analysis data exported to Excel.",
      });
    } catch (error) {
      console.error('Excel export failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export territory analysis data.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateExecutiveSummaryWrapper = () => {
    handleGenerateExecutiveSummary(cbsaData);
  };

  // Don't render until CBSA data is initialized
  if (!isInitialized) {
    return <div className="container mx-auto py-8 px-4 text-center">Loading market data...</div>;
  }

  const hasAnalysisData = currentAnalysis && currentAnalysis.criteriaColumns.length > 0;

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <TerritoryHeader />
      
      <PromptInput
        value={prompt}
        onChange={setPrompt}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        hasData={hasAnalysisData}
        onClearAnalysis={handleClearAnalysis}
        analysisMode={analysisMode}
        onAnalysisModeChange={setAnalysisMode}
        scoringMode={scoringMode}
        onScoringModeChange={setScoringMode}
      />

      <TerritoryNotices user={user} cbsaDataLength={cbsaData.length} />

      {/* Progress Counter */}
      {isLoading && (
        <ProgressCounter
          isActive={isLoading}
          startTime={analysisStartTime}
          duration={estimatedDuration}
          analysisMode={scoringMode}
          onComplete={cancelAnalysis}
        />
      )}

      <ErrorDisplay error={error} />

      {/* Executive Summary */}
      <FinalExecutiveSummary
        executiveSummary={executiveSummary}
        isGeneratingSummary={isGeneratingSummary}
        hasAnalysisData={hasAnalysisData}
        onGenerateExecutiveSummary={handleGenerateExecutiveSummaryWrapper}
        onUpdateExecutiveSummary={handleUpdateExecutiveSummary}
        cbsaData={cbsaData}
      />

      {/* AI Logic Summary */}
      {hasAnalysisData && (
        <ExecutiveSummary
          criteriaColumns={currentAnalysis.criteriaColumns}
        />
      )}

      {/* Column Management */}
      {hasAnalysisData && (
        <ColumnManagement
          criteriaColumns={currentAnalysis.criteriaColumns}
          onToggleColumn={toggleColumnInSignalScore}
          onDeleteColumn={deleteColumn}
          onRenameColumn={renameColumn}
        />
      )}

      {/* Export Controls */}
      {hasAnalysisData && (
        <ExportControls
          onClearAnalysis={handleClearAnalysis}
          onExportCSV={handleExportCSV}
          onExportExcel={handleExportExcel}
        />
      )}

      {/* Territory Analysis Table */}
      {hasAnalysisData && (
        <CBSATable
          cbsaData={cbsaData}
          criteriaColumns={currentAnalysis.criteriaColumns}
          marketSignalScore={currentAnalysis.marketSignalScore || 0}
          accountGoodThreshold={accountGoodThreshold}
          accountBadThreshold={accountBadThreshold}
          refreshingColumnId={refreshingColumnId}
          onStatusChange={handleStatusChange}
          onManualScoreOverride={applyManualOverride}
          onRefreshColumn={(columnId: string, type: 'all' | 'na-only') => refreshColumn(columnId, type, cbsaData)}
        />
      )}
    </div>
  );
};

const TerritoryTargeterPage: React.FC = () => {
  return (
    <TerritoryTargeterErrorBoundary>
      <TerritoryTargeterPageContent />
    </TerritoryTargeterErrorBoundary>
  );
};

export default TerritoryTargeterPage;
