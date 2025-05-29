import { CBSAData, CBSAScore, TerritoryAnalysis } from '@/types/territoryTargeterTypes';
import { format } from 'date-fns';

export interface TerritoryExportData {
  cbsaData: CBSAData[];
  scores: CBSAScore[];
  analysis: TerritoryAnalysis;
}

const formatPopulationGrowth = (growth: number) => {
  const percentage = (growth * 100).toFixed(2);
  return growth >= 0 ? `+${percentage}%` : `${percentage}%`;
};

export const exportTerritoryAnalysisToCSV = (exportData: TerritoryExportData): void => {
  const { cbsaData, scores, analysis } = exportData;

  // Merge data for CSV
  const csvData = cbsaData.map(cbsa => {
    const scoreData = scores.find(s => s.market === cbsa.name);
    return {
      'CBSA Name': cbsa.name,
      'State': cbsa.state,
      'Region': cbsa.region,
      'Population': cbsa.population,
      'Population Growth': formatPopulationGrowth(cbsa.populationGrowth),
      'Score': scoreData?.score || 'N/A',
      'AI Reasoning': scoreData?.reasoning || 'No score available'
    };
  });

  // Create CSV content
  const headers = Object.keys(csvData[0]);
  const csvContent = [
    // Add metadata header
    `Territory Analysis Export - ${format(analysis.createdAt, 'MMM dd, yyyy')}`,
    `Scoring Criteria: "${analysis.prompt}"`,
    `Market Signal Score: ${analysis.marketSignalScore}%`,
    `Executive Summary: "${analysis.results.prompt_summary}"`,
    '', // Empty row
    // Add column headers
    headers.join(','),
    // Add data rows
    ...csvData.map(row => 
      headers.map(header => {
        const value = row[header as keyof typeof row];
        // Escape quotes and wrap in quotes if contains comma
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // Download CSV
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `territory_analysis_${format(analysis.createdAt, 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
