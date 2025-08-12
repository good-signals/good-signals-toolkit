import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Clock, Target } from 'lucide-react';
import { CBSAData, TerritoryAnalysis } from '@/types/territoryTargeterTypes';

interface TerritoryAnalysisMetricsProps {
  cbsaData: CBSAData[];
  currentAnalysis: TerritoryAnalysis | null;
  isAnalyzing: boolean;
}

export function TerritoryAnalysisMetrics({ 
  cbsaData, 
  currentAnalysis, 
  isAnalyzing 
}: TerritoryAnalysisMetricsProps) {
  if (!currentAnalysis) return null;

  const totalMarkets = cbsaData.length;
  const completionMetrics = currentAnalysis.criteriaColumns.map(column => {
    const scoredMarkets = column.scores.filter(score => 
      score.score !== null && score.score !== undefined
    ).length;
    
    const matchedMarkets = cbsaData.filter(cbsa => {
      const hasScore = column.scores.some(score => score.market === cbsa.name);
      return hasScore;
    }).length;
    
    const completionRate = totalMarkets > 0 ? (matchedMarkets / totalMarkets) * 100 : 0;
    
    return {
      columnId: column.id,
      title: column.title,
      scoredMarkets,
      matchedMarkets,
      completionRate,
      isComplete: completionRate === 100
    };
  });

  const overallCompletion = completionMetrics.length > 0 
    ? completionMetrics.reduce((sum, metric) => sum + metric.completionRate, 0) / completionMetrics.length 
    : 0;

  const perfectColumns = completionMetrics.filter(m => m.isComplete).length;
  const totalColumns = completionMetrics.length;

  const getStatusIcon = (rate: number) => {
    if (rate === 100) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (rate >= 80) return <Target className="h-4 w-4 text-orange-500" />;
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (rate: number) => {
    if (rate === 100) return <Badge variant="default" className="bg-green-600">100%</Badge>;
    if (rate >= 80) return <Badge variant="secondary">Partial</Badge>;
    return <Badge variant="destructive">Incomplete</Badge>;
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isAnalyzing ? (
            <Clock className="h-5 w-5 animate-spin" />
          ) : (
            getStatusIcon(overallCompletion)
          )}
          Analysis Completion Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{totalMarkets}</div>
            <div className="text-sm text-muted-foreground">Total Markets</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{totalColumns}</div>
            <div className="text-sm text-muted-foreground">Analysis Columns</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{perfectColumns}</div>
            <div className="text-sm text-muted-foreground">Perfect Columns</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{overallCompletion.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Overall Completion</div>
          </div>
        </div>

        {completionMetrics.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium mb-2">Column Completion Details</h4>
            {completionMetrics.map(metric => (
              <div key={metric.columnId} className="flex items-center justify-between p-2 rounded border">
                <div className="flex items-center gap-2">
                  {getStatusIcon(metric.completionRate)}
                  <span className="font-medium">{metric.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {metric.matchedMarkets}/{totalMarkets} markets
                  </span>
                  {getStatusBadge(metric.completionRate)}
                </div>
              </div>
            ))}
          </div>
        )}

        {overallCompletion === 100 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Perfect Analysis Achieved!</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              All {totalMarkets} markets have been analyzed across all {totalColumns} criteria columns.
            </p>
          </div>
        )}

        {overallCompletion < 100 && !isAnalyzing && (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 text-orange-800">
              <Target className="h-5 w-5" />
              <span className="font-medium">Analysis Incomplete</span>
            </div>
            <p className="text-sm text-orange-700 mt-1">
              Use the "Refresh N/A Values" option on incomplete columns to achieve 100% completion.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}