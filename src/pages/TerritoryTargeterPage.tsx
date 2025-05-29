
import React, { useState } from 'react';
import { Search, Download, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PromptInput from '@/components/territory-targeter/PromptInput';
import CBSATable from '@/components/territory-targeter/CBSATable';
import ExecutiveSummary from '@/components/territory-targeter/ExecutiveSummary';
import { useTerritoryScoring } from '@/hooks/useTerritoryScoring';
import { sampleCBSAData } from '@/data/sampleCBSAData';
import { exportTerritoryAnalysisToCSV } from '@/services/territoryExportService';
import { useAuth } from '@/contexts/AuthContext';

const TerritoryTargeterPage = () => {
  const { user } = useAuth();
  const [cbsaData] = useState(sampleCBSAData);
  const { isLoading, currentAnalysis, error, runScoring } = useTerritoryScoring();

  const handlePromptSubmit = async (prompt: string) => {
    try {
      await runScoring(prompt, cbsaData);
    } catch (err) {
      console.error('Failed to run scoring:', err);
    }
  };

  const handleExport = () => {
    if (!currentAnalysis) return;

    exportTerritoryAnalysisToCSV({
      cbsaData,
      scores: currentAnalysis.results.scores,
      analysis: currentAnalysis
    });
  };

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
        disabled={!user}
      />

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 2. Executive Summary (only show after analysis) */}
      {currentAnalysis && (
        <>
          <ExecutiveSummary 
            summary={currentAnalysis.results.prompt_summary}
            prompt={currentAnalysis.prompt}
          />

          {/* Export Button */}
          <div className="flex justify-end mb-6">
            <Button onClick={handleExport} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export to CSV
            </Button>
          </div>
        </>
      )}

      {/* 3. CBSA Table - Always show with population data */}
      <CBSATable 
        cbsaData={cbsaData}
        scores={currentAnalysis?.results.scores || []}
        marketSignalScore={currentAnalysis?.marketSignalScore || 0}
        accountGoodThreshold={0.75}
        accountBadThreshold={0.50}
      />
    </div>
  );
};

export default TerritoryTargeterPage;
