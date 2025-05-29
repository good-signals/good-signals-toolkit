
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import TerritoryHeader from './TerritoryHeader';
import TerritoryNotices from './TerritoryNotices';
import SignalSettingsNotice from './SignalSettingsNotice';
import PromptInput from './PromptInput';
import TerritoryResultsSection from './TerritoryResultsSection';
import CBSATable from './CBSATable';
import { useTerritoryScoring } from '@/hooks/useTerritoryScoring';
import { useAccountSettings } from '@/hooks/territory-targeter/useAccountSettings';
import { useExecutiveSummary } from '@/hooks/territory-targeter/useExecutiveSummary';
import { useCBSAStatus } from '@/hooks/territory-targeter/useCBSAStatus';
import { exportTerritoryAnalysisToCSV, exportTerritoryAnalysisToExcel } from '@/services/territoryExportService';
import { useAuth } from '@/contexts/AuthContext';
import { ManualScoreOverride } from '@/types/territoryTargeterTypes';

const TerritoryTargeterPageContent = () => {
  const { user } = useAuth();
  
  const { cbsaData, isInitialized, handleStatusChange } = useCBSAStatus();
  const { 
    accounts, 
    isLoadingAccounts, 
    currentAccount, 
    accountGoodThreshold, 
    accountBadThreshold 
  } = useAccountSettings(user?.id);
  
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

  const handleExportCSV = () => {
    if (!currentAnalysis) return;

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
      executiveSummary
    });
  };

  const handleExportExcel = () => {
    if (!currentAnalysis) return;

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

    exportTerritoryAnalysisToExcel({
      cbsaData,
      scores: allScores,
      analysis: currentAnalysis,
      executiveSummary
    });
  };

  const handleClearAnalysis = () => {
    clearAnalysis();
    setExecutiveSummary('');
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

  const averageMarketSignalScore = currentAnalysis 
    ? Math.round(
        currentAnalysis.criteriaColumns.reduce((total, column) => {
          const avgScore = column.scores.reduce((sum, score) => sum + score.score, 0) / column.scores.length;
          return total + avgScore;
        }, 0) / currentAnalysis.criteriaColumns.length
      )
    : 0;

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
      <TerritoryHeader />

      <TerritoryNotices user={user} cbsaDataLength={cbsaData.length} />
      <SignalSettingsNotice 
        currentAccount={currentAccount}
        accountGoodThreshold={accountGoodThreshold}
        accountBadThreshold={accountBadThreshold}
      />

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

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {currentAnalysis && currentAnalysis.criteriaColumns.length > 0 && (
        <TerritoryResultsSection
          currentAnalysis={currentAnalysis}
          cbsaData={cbsaData}
          executiveSummary={executiveSummary}
          isGeneratingSummary={isGeneratingSummary}
          onGenerateSummary={handleGenerateSummary}
          onToggleColumn={handleToggleColumn}
          onDeleteColumn={handleDeleteColumn}
          onClearAnalysis={handleClearAnalysis}
          onExportCSV={handleExportCSV}
          onExportExcel={handleExportExcel}
        />
      )}

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

export default TerritoryTargeterPageContent;
