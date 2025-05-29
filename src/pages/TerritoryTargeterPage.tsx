
import React, { useEffect } from 'react';
import { sampleCBSAData } from '@/data/sampleCBSAData';
import { useTerritoryScoring } from '@/hooks/useTerritoryScoring';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PromptInput from '@/components/territory-targeter/PromptInput';
import CBSATable from '@/components/territory-targeter/CBSATable';
import ProgressCounter from '@/components/territory-targeter/ProgressCounter';
import AnalysisModeSelector from '@/components/territory-targeter/AnalysisModeSelector';
import ExecutiveSummary from '@/components/territory-targeter/ExecutiveSummary';
import MarketSignalSummary from '@/components/territory-targeter/table/MarketSignalSummary';
import { exportTerritoryAnalysisToCSV } from '@/services/territoryExportService';
import { Button } from '@/components/ui/button';
import { Download, RotateCcw } from 'lucide-react';
import { CBSAStatus } from '@/components/territory-targeter/table/CBSAStatusSelector';

const TerritoryTargeterPage: React.FC = () => {
  const {
    isLoading,
    currentAnalysis,
    error,
    analysisStartTime,
    analysisMode,
    estimatedDuration,
    isRefreshing,
    runScoring,
    refreshColumn,
    applyManualOverride,
    toggleColumnInSignalScore,
    deleteColumn,
    clearAnalysis,
    setAnalysisMode
  } = useTerritoryScoring();

  const [cbsaStatuses, setCbsaStatuses] = React.useState<{ [cbsaId: string]: CBSAStatus }>({});

  const handleAnalysis = async (prompt: string) => {
    try {
      await runScoring(prompt, sampleCBSAData, analysisMode);
    } catch (err) {
      console.error('Analysis failed:', err);
    }
  };

  const handleStatusChange = (cbsaId: string, status: CBSAStatus) => {
    setCbsaStatuses(prev => ({
      ...prev,
      [cbsaId]: status
    }));
  };

  const handleExport = () => {
    if (!currentAnalysis) return;
    
    const exportData = {
      cbsaData: sampleCBSAData.map(cbsa => ({
        ...cbsa,
        status: cbsaStatuses[cbsa.id]
      })),
      scores: currentAnalysis.criteriaColumns.flatMap(column => column.scores),
      analysis: currentAnalysis
    };
    
    exportTerritoryAnalysisToCSV(exportData);
  };

  // Auto-save analysis state on changes
  useEffect(() => {
    if (currentAnalysis) {
      console.log('Analysis updated:', currentAnalysis);
    }
  }, [currentAnalysis]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Territory Targeter</h1>
        <div className="flex gap-2">
          {currentAnalysis && (
            <>
              <Button 
                onClick={handleExport} 
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button 
                onClick={clearAnalysis}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Clear Analysis
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Analysis Mode Selector */}
      <AnalysisModeSelector 
        selectedMode={analysisMode}
        onModeChange={setAnalysisMode}
        disabled={isLoading}
      />

      {/* Progress Counter */}
      {isLoading && analysisStartTime && (
        <ProgressCounter 
          isActive={isLoading}
          startTime={analysisStartTime}
          duration={estimatedDuration}
          analysisMode={analysisMode}
        />
      )}

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Territory Analysis Criteria</CardTitle>
        </CardHeader>
        <CardContent>
          <PromptInput 
            onSubmit={handleAnalysis}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {/* Executive Summary */}
      {currentAnalysis && (
        <ExecutiveSummary 
          criteriaColumns={currentAnalysis.criteriaColumns}
        />
      )}

      {/* Market Signal Summary */}
      {currentAnalysis && currentAnalysis.criteriaColumns.length > 1 && (
        <MarketSignalSummary 
          marketSignalScore={currentAnalysis.marketSignalScore}
        />
      )}

      {/* Results Table */}
      {currentAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle>Market Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            <CBSATable 
              cbsaData={sampleCBSAData}
              criteriaColumns={currentAnalysis.criteriaColumns}
              marketSignalScore={currentAnalysis.marketSignalScore}
              onStatusChange={handleStatusChange}
              onManualScoreOverride={applyManualOverride}
              onRefreshColumn={(columnId, type) => refreshColumn(columnId, type, sampleCBSAData)}
              onToggleColumn={toggleColumnInSignalScore}
              onDeleteColumn={deleteColumn}
              isRefreshing={isRefreshing}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TerritoryTargeterPage;
