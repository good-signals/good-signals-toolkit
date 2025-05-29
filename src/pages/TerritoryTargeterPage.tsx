import React, { useState, useEffect } from 'react';
import { Search, Download, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import PromptInput from '@/components/territory-targeter/PromptInput';
import CBSATable from '@/components/territory-targeter/CBSATable';
import ExecutiveSummary from '@/components/territory-targeter/ExecutiveSummary';
import TerritoryExecutiveSummary from '@/components/territory-targeter/TerritoryExecutiveSummary';
import ColumnManagement from '@/components/territory-targeter/ColumnManagement';
import { useTerritoryScoring } from '@/hooks/useTerritoryScoring';
import { sampleCBSAData } from '@/data/sampleCBSAData';
import { exportTerritoryAnalysisToCSV } from '@/services/territoryExportService';
import { useAuth } from '@/contexts/AuthContext';
import { CBSAData, ManualScoreOverride } from '@/types/territoryTargeterTypes';
import { CBSAStatus } from '@/components/territory-targeter/table/CBSAStatusSelector';
import { safeStorage } from '@/utils/safeStorage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const TerritoryTargeterPageContent = () => {
  const { user } = useAuth();
  const [cbsaData, setCbsaData] = useState<CBSAData[]>(sampleCBSAData);
  const [isInitialized, setIsInitialized] = useState(false);
  const [executiveSummary, setExecutiveSummary] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  
  // Load saved statuses from localStorage on component mount
  useEffect(() => {
    try {
      const savedStatuses = safeStorage.getItem('cbsa-statuses');
      if (savedStatuses) {
        const statusMap = safeStorage.safeParse(savedStatuses, {});
        setCbsaData(prevData =>
          prevData.map(cbsa => ({
            ...cbsa,
            status: statusMap[cbsa.id] || undefined
          }))
        );
      }
    } catch (error) {
      console.error('Failed to load saved CBSA statuses:', error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const handlePromptSubmit = async (prompt: string, mode: 'fast' | 'detailed' = 'detailed') => {
    try {
      await runScoring(prompt, cbsaData, mode);
    } catch (err) {
      console.error('Failed to run scoring:', err);
    }
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
      analysis: currentAnalysis
    });
  };

  const handleClearAnalysis = () => {
    clearAnalysis();
  };

  const handleStatusChange = (cbsaId: string, status: CBSAStatus) => {
    // Update the local state
    setCbsaData(prevData => 
      prevData.map(cbsa => 
        cbsa.id === cbsaId ? { ...cbsa, status } : cbsa
      )
    );

    // Save to localStorage
    try {
      const savedStatuses = safeStorage.getItem('cbsa-statuses');
      let statusMap = {};
      if (savedStatuses) {
        statusMap = safeStorage.safeParse(savedStatuses, {});
      }
      
      statusMap[cbsaId] = status;
      safeStorage.setItem('cbsa-statuses', JSON.stringify(statusMap));
    } catch (error) {
      console.error('Failed to save CBSA status:', error);
    }
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

  const handleGenerateExecutiveSummary = async () => {
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
  if (!isInitialized) {
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

      {/* CBSA Data Info */}
      <div className="mb-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Currently showing top {cbsaData.length} U.S. CBSAs by population. You can upload your own CBSA dataset to replace this sample data.
          </AlertDescription>
        </Alert>
      </div>

      {/* Authentication Notice */}
      {!user && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please sign in to use the Territory Targeter tool.
          </AlertDescription>
        </Alert>
      )}

      {/* 1. Prompt Input */}
      <PromptInput 
        onSubmit={handlePromptSubmit}
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
            onGenerateSummary={handleGenerateExecutiveSummary}
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
        accountGoodThreshold={0.75}
        accountBadThreshold={0.50}
        onStatusChange={handleStatusChange}
        onManualScoreOverride={handleManualScoreOverride}
        onRefreshColumn={handleRefreshColumn}
        isRefreshing={isRefreshing}
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
