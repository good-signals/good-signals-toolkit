
import React, { useState } from 'react';
import { CBSAData } from '@/types/territoryTargeterTypes';
import { useCBSAStatus } from '@/hooks/territory-targeter/useCBSAStatus';
import { useTerritoryScoring } from '@/hooks/useTerritoryScoring';
import { useExecutiveSummary } from '@/hooks/territory-targeter/useExecutiveSummary';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountSettings } from '@/hooks/territory-targeter/useAccountSettings';
import TerritoryHeader from '@/components/territory-targeter/TerritoryHeader';
import PromptInput from '@/components/territory-targeter/PromptInput';
import AnalysisModeSelector from '@/components/territory-targeter/AnalysisModeSelector';
import TerritoryNotices from '@/components/territory-targeter/TerritoryNotices';
import CBSATable from '@/components/territory-targeter/CBSATable';
import ExecutiveSummary from '@/components/territory-targeter/ExecutiveSummary';
import ColumnManagement from '@/components/territory-targeter/ColumnManagement';
import ExportControls from '@/components/territory-targeter/ExportControls';
import ProgressCounter from '@/components/territory-targeter/ProgressCounter';
import { exportTerritoryAnalysisToCSV, exportTerritoryAnalysisToExcel } from '@/services/territoryExportService';
import { toast } from '@/hooks/use-toast';

const TerritoryTargeterPage: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [analysisMode, setAnalysisMode] = useState<'manual' | 'ai'>('ai');
  const [scoringMode, setScoringMode] = useState<'fast' | 'detailed'>('detailed');

  const { user } = useAuth();
  const { cbsaData, isInitialized, handleStatusChange } = useCBSAStatus();
  const { accountGoodThreshold, accountBadThreshold } = useAccountSettings();

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
    setAnalysisMode: setScoringAnalysisMode
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

  // Don't render until CBSA data is initialized
  if (!isInitialized) {
    return <div className="container mx-auto py-8 px-4 text-center">Loading...</div>;
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
      />

      <AnalysisModeSelector
        value={analysisMode}
        onChange={setAnalysisMode}
      />

      {/* Analysis Mode Selection */}
      <div className="mt-6 bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Analysis Depth</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setScoringMode('fast')}
              className={`px-4 py-2 rounded-md transition-colors ${
                scoringMode === 'fast'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Fast Analysis
            </button>
            <button
              onClick={() => setScoringMode('detailed')}
              className={`px-4 py-2 rounded-md transition-colors ${
                scoringMode === 'detailed'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Detailed Analysis
            </button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {scoringMode === 'fast' 
            ? 'Fast analysis provides quick results with basic scoring (~2-3 minutes)'
            : 'Detailed analysis provides comprehensive scoring with deeper insights (~5-8 minutes)'
          }
        </p>
      </div>

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

      {/* Error Display */}
      {error && (
        <div className="mt-6 p-4 border border-destructive/50 bg-destructive/10 text-destructive rounded-lg">
          <h4 className="font-medium mb-2">Analysis Error</h4>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Results Table */}
      {hasAnalysisData && (
        <div className="mt-6">
          <CBSATable
            cbsaData={cbsaData}
            criteriaColumns={currentAnalysis.criteriaColumns}
            marketSignalScore={currentAnalysis.marketSignalScore || 0}
            accountGoodThreshold={accountGoodThreshold}
            accountBadThreshold={accountBadThreshold}
            onStatusChange={handleStatusChange}
            onManualScoreOverride={applyManualOverride}
            onRefreshColumn={(columnId: string, type: 'all' | 'na-only') => refreshColumn(columnId, type, cbsaData)}
            refreshingColumnId={refreshingColumnId}
          />
        </div>
      )}

      {/* Executive Summary */}
      {hasAnalysisData && (
        <div className="mt-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Executive Summary</h3>
              {!executiveSummary && (
                <button
                  onClick={() => handleGenerateExecutiveSummary(cbsaData)}
                  disabled={isGeneratingSummary}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {isGeneratingSummary ? 'Generating...' : 'Generate AI Summary'}
                </button>
              )}
            </div>
            
            {executiveSummary ? (
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {executiveSummary}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <button
                    onClick={() => handleUpdateExecutiveSummary('')}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Clear and regenerate
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Generate an AI-powered executive summary of your territory analysis results.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TerritoryTargeterPage;
