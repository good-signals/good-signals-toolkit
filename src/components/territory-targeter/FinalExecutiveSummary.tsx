
import React from 'react';

interface FinalExecutiveSummaryProps {
  executiveSummary: string | null;
  isGeneratingSummary: boolean;
  hasAnalysisData: boolean;
  onGenerateExecutiveSummary: (cbsaData: any[]) => void;
  onUpdateExecutiveSummary: (summary: string) => void;
  cbsaData: any[];
}

const FinalExecutiveSummary: React.FC<FinalExecutiveSummaryProps> = ({
  executiveSummary,
  isGeneratingSummary,
  hasAnalysisData,
  onGenerateExecutiveSummary,
  onUpdateExecutiveSummary,
  cbsaData
}) => {
  if (!hasAnalysisData) return null;

  return (
    <div className="mt-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Executive Summary</h3>
          {!executiveSummary && (
            <button
              onClick={() => onGenerateExecutiveSummary(cbsaData)}
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
                onClick={() => onUpdateExecutiveSummary('')}
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
  );
};

export default FinalExecutiveSummary;
