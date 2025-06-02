
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

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
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Executive Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          {!executiveSummary && (
            <Button
              onClick={() => onGenerateExecutiveSummary(cbsaData)}
              disabled={isGeneratingSummary}
              className="ml-auto"
            >
              {isGeneratingSummary ? 'Generating...' : 'Generate AI Summary'}
            </Button>
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
      </CardContent>
    </Card>
  );
};

export default FinalExecutiveSummary;
