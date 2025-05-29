
import React from 'react';
import { Search, Download, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import PromptInput from '@/components/territory-targeter/PromptInput';
import CBSATable from '@/components/territory-targeter/CBSATable';
import ExecutiveSummary from '@/components/territory-targeter/ExecutiveSummary';
import TerritoryExecutiveSummary from '@/components/territory-targeter/TerritoryExecutiveSummary';
import ColumnManagement from '@/components/territory-targeter/ColumnManagement';
import TerritoryNotices from '@/components/territory-targeter/TerritoryNotices';
import SignalSettingsNotice from '@/components/territory-targeter/SignalSettingsNotice';
import { useTerritoryScoring } from '@/hooks/useTerritoryScoring';
import { useAccountSettings } from '@/hooks/territory-targeter/useAccountSettings';
import { useExecutiveSummary } from '@/hooks/territory-targeter/useExecutiveSummary';
import { useCBSAStatus } from '@/hooks/territory-targeter/useCBSAStatus';
import { exportTerritoryAnalysisToCSV } from '@/services/territoryExportService';
import { useAuth } from '@/contexts/AuthContext';
import { ManualScoreOverride } from '@/types/territoryTargeterTypes';

const TerritoryTargeterPageContent = () => {
  const { user } = useAuth();
  
  // Custom hooks for different concerns
  const { cbsaData, isInitialized, handleStatusChange } = useCBSAStatus();
  const { 
    accounts, 
    isLoadingAccounts, 
    currentAccount, 
    accountGoodThreshold, 
    accountBadThreshold 
  } = useAccountSettings(user?.id);
  
  // Use the territory scoring hook
  const {
    isLoading,
    currentAnalysis,
    error,
    analysisStartTime,
    analysisMode,
    estimatedDuration,
    refreshingColumnId,
    runScoring,
    cancelAnalysis,
    refreshColumn,
    applyManualOverride,
    toggleColumnInSignalScore,
    deleteColumn,
    clearAnalysis,
    setAnalysisMode
  } = useTerritoryScoring();

  const {
    executiveSummary,
    setExecutiveSummary,
    isGeneratingSummary,
    handleGenerateExecutiveSummary
  } = useExecutiveSummary(currentAnalysis, user);

  const handlePromptSubmit = async (prompt: string, mode: 'fast' | 'detailed' = 'detailed') => {
    try {
      await runScoring(prompt, cbsaData, mode);
    } catch (err) {
      console.error('Failed to run scoring:', err);
    }
  };

  const handleCancelAnalysis = () => {
    cancelAnalysis();
  };

  const handleExport = () => {
    if (!currentAnalysis) return;

    // Flatten all scores for CSV export
    const allScores: any[] = [];
    currentAnalysis.criteriaColumns.forEach(column => {
      column.scores.forEach(score => {
        allScores.push({
          ...score,
          criteriaTitle: column.title,
          criteriaId: column.id
        });
      });
    });

    exportTerritoryAnalysisToCSV({
      cbsaData,
      scores: allScores,
      analysis: currentAnalysis,
      executiveSummary // Pass the executive summary to the export
    });
  };

  const handleClearAnalysis = () => {
    clearAnalysis();
    setExecutiveSummary(''); // Clear executive summary when clearing analysis
  };

  const handleRefreshColumn = async (columnId: string, type: 'all' | 'na-only') => {
    await refreshColumn(columnId, type, cbsaData);
  };

  const handleManualScoreOverride = (override: ManualScoreOverride) => {
    applyManualOverride(override);
  };

  const handleToggleColumn = (columnId: string, included: boolean) => {
    toggleColumnInSignalScore(columnId, included);
  };

  const handleDeleteColumn = (columnId: string) => {
    deleteColumn(columnId);
  };

  const handleGenerateSummary = async () => {
    await handleGenerateExecutiveSummary(cbsaData);
  };

  // Calculate average market signal score across all criteria
  const averageMarketSignalScore = currentAnalysis 
    ? Math.round(
        currentAnalysis.criteriaColumns.reduce((total, column) => {
          const avgScore = column.scores.reduce((sum, score) => sum + score.score, 0) / column.scores.length;
          return total + avgScore;
        }, 0) / currentAnalysis.criteriaColumns.length
      )
    : 0;

  // Show loading state while initializing
  if (!isInitialized || isLoadingAccounts) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mx-auto mb-4"></div>
            <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-8">
        <Search size={48} className="text-primary mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-primary mb-4">Territory Targeter</h1>
        <p className="text-lg text-foreground/80 max-w-2xl mx-auto">
          AI-powered scoring to rank and compare U.S. markets based on your custom criteria.
        </p>
      </div>

      {/* Notices */}
      <TerritoryNotices user={user} cbsaDataLength={cbsaData.length} />
      <SignalSettingsNotice 
        currentAccount={currentAccount}
        accountGoodThreshold={accountGoodThreshold}
        accountBadThreshold={accountBadThreshold}
      />

      {/* 1. Prompt Input */}
      <PromptInput 
        onSubmit={handlePromptSubmit}
        onCancel={handleCancelAnalysis}
        isLoading={isLoading}
        analysisStartTime={analysisStartTime}
        analysisMode={analysisMode}
        estimatedDuration={estimatedDuration}
        disabled={!user}
        onModeChange={setAnalysisMode}
        hasExistingAnalysis={!!currentAnalysis && currentAnalysis.criteriaColumns.length > 0}
      />

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 2. AI Logic Summary and Executive Summary (only show after analysis) */}
      {currentAnalysis && currentAnalysis.criteriaColumns.length > 0 && (
        <>
          <ExecutiveSummary 
            criteriaColumns={currentAnalysis.criteriaColumns}
          />

          {/* Executive Summary */}
          <TerritoryExecutiveSummary
            analysis={currentAnalysis}
            cbsaData={cbsaData}
            onGenerateSummary={handleGenerateSummary}
            isGenerating={isGeneratingSummary}
            executiveSummary={executiveSummary}
          />

          {/* 3. Column Management */}
          <ColumnManagement
            criteriaColumns={currentAnalysis.criteriaColumns}
            onToggleColumn={handleToggleColumn}
            onDeleteColumn={handleDeleteColumn}
          />

          {/* Export and Clear Buttons */}
          <div className="flex justify-end gap-2 mb-6">
            <Button onClick={handleClearAnalysis} variant="outline">
              Clear Analysis
            </Button>
            <Button onClick={handleExport} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export to CSV
            </Button>
          </div>
        </>
      )}

      {/* 4. CBSA Table - Always show with population data */}
      <CBSATable 
        cbsaData={cbsaData}
        criteriaColumns={currentAnalysis?.criteriaColumns || []}
        marketSignalScore={averageMarketSignalScore}
        accountGoodThreshold={accountGoodThreshold}
        accountBadThreshold={accountBadThreshold}
        onStatusChange={handleStatusChange}
        onManualScoreOverride={handleManualScoreOverride}
        onRefreshColumn={handleRefreshColumn}
        refreshingColumnId={refreshingColumnId}
      />
    </div>
  );
};

const TerritoryTargeterPage = () => {
  return (
    <ErrorBoundary>
      <TerritoryTargeterPageContent />
    </ErrorBoundary>
  );
};

export default TerritoryTargeterPage;
