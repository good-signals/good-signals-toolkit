
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CBSAData } from '@/types/territoryTargeterTypes';

interface TerritoryExecutiveSummaryProps {
  cbsaData: CBSAData[];
  analysis?: any;
  onGenerateSummary?: () => void;
  isGenerating?: boolean;
}

const TerritoryExecutiveSummary: React.FC<TerritoryExecutiveSummaryProps> = ({
  cbsaData,
  analysis,
  onGenerateSummary,
  isGenerating,
}) => {
  if (cbsaData.length === 0) {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Executive Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p>
            Analysis completed for {cbsaData.length} territories.
          </p>
          {cbsaData.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Key Insights:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Total territories analyzed: {cbsaData.length}</li>
                <li>Territories with data: {cbsaData.filter(t => t.score).length}</li>
                <li>Average signal score: {
                  cbsaData.length > 0 
                    ? (cbsaData.reduce((sum, t) => sum + (t.score || 0), 0) / cbsaData.length).toFixed(2)
                    : 'N/A'
                }</li>
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TerritoryExecutiveSummary;
