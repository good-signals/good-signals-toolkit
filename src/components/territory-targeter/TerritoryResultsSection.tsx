
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CBSAData } from '@/types/territoryTargeterTypes';
import { Loader2 } from 'lucide-react';

interface TerritoryResultsSectionProps {
  cbsaData: CBSAData[];
  isLoading: boolean;
  error: string | null;
  analysisMode: 'manual' | 'ai';
}

const TerritoryResultsSection: React.FC<TerritoryResultsSectionProps> = ({
  cbsaData,
  isLoading,
  error,
  analysisMode,
}) => {
  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
            <p className="text-muted-foreground">Analyzing territories...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-destructive">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (cbsaData.length === 0) {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Territory Analysis Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Found {cbsaData.length} territories matching your criteria
          </p>
          <div className="grid gap-2">
            {cbsaData.slice(0, 5).map((territory, index) => (
              <div key={index} className="p-3 border rounded-md">
                <h4 className="font-medium">{territory.name || `Territory ${index + 1}`}</h4>
                <p className="text-sm text-muted-foreground">
                  Score: {territory.score || 'N/A'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TerritoryResultsSection;
