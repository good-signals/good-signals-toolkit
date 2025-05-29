
import { CBSAData, CBSAScore, TerritoryAnalysis } from '@/types/territoryTargeterTypes';
import { format } from 'date-fns';

export interface TerritoryExportData {
  cbsaData: CBSAData[];
  scores: CBSAScore[];
  analysis: TerritoryAnalysis;
  executiveSummary?: string;
}

const formatPopulationGrowth = (growth: number) => {
  const percentage = (growth * 100).toFixed(2);
  return growth >= 0 ? `+${percentage}%` : `${percentage}%`;
};

export const exportTerritoryAnalysisToCSV = (exportData: TerritoryExportData): void => {
  const { cbsaData, analysis, executiveSummary } = exportData;

  // Merge data for CSV
  const csvData = cbsaData.map(cbsa => {
    const row: any = {
      'CBSA Name': cbsa.name,
      'State': cbsa.state,
      'Region': cbsa.region,
      'Population': cbsa.population,
      'Population Growth': formatPopulationGrowth(cbsa.populationGrowth)
    };

    // Add individual criteria scores
    const marketScores: number[] = [];
    const includedMarketScores: number[] = [];
    
    analysis.criteriaColumns.forEach(column => {
      const scoreData = column.scores.find(s => s.market === cbsa.name);
      row[`${column.title} Score`] = scoreData?.score ?? 'N/A';
      row[`${column.title} Reasoning`] = scoreData?.reasoning || 'No reasoning available';
      
      if (scoreData?.score !== null && scoreData?.score !== undefined) {
        marketScores.push(scoreData.score);
        
        // Only include in Market Signal Score if column is included
        if (column.isIncludedInSignalScore !== false) {
          includedMarketScores.push(scoreData.score);
        }
      }
    });

    // Add Market Signal Score if there are multiple criteria
    if (analysis.criteriaColumns.length > 1) {
      const averageScore = includedMarketScores.length > 0 
        ? Math.round(includedMarketScores.reduce((sum, score) => sum + score, 0) / includedMarketScores.length)
        : 'N/A';
      row['Market Signal Score'] = averageScore;
    }

    return row;
  });

  // Build CSV content with enhanced sections
  const csvContent = [];
  
  // Header section with metadata
  csvContent.push(`Territory Analysis Export - ${format(analysis.createdAt, 'MMM dd, yyyy')}`);
  csvContent.push(`Criteria Count: ${analysis.criteriaColumns.length}`);
  csvContent.push(`Market Signal Score: ${analysis.marketSignalScore}%`);
  csvContent.push(`Analysis Summary: ${analysis.criteriaColumns.map(c => c.title).join(', ')}`);
  csvContent.push('');

  // AI Logic Summary section
  if (analysis.criteriaColumns.length > 0) {
    csvContent.push('=== AI LOGIC SUMMARY ===');
    csvContent.push('');
    
    analysis.criteriaColumns.forEach((column, index) => {
      csvContent.push(`Criteria ${index + 1}: ${column.title}`);
      csvContent.push(`User Prompt: "${column.prompt}"`);
      csvContent.push(`Analysis Mode: ${column.analysisMode === 'fast' ? 'Fast' : 'Detailed'}`);
      csvContent.push(`AI Logic: ${column.logicSummary}`);
      csvContent.push(`Included in Market Signal Score: ${column.isIncludedInSignalScore !== false ? 'Yes' : 'No'}`);
      csvContent.push('');
    });
  }

  // Executive Summary section
  if (executiveSummary) {
    csvContent.push('=== AI EXECUTIVE SUMMARY ===');
    csvContent.push('');
    // Split executive summary into paragraphs and add each as a separate line
    const summaryParagraphs = executiveSummary.split('\n').filter(p => p.trim());
    summaryParagraphs.forEach(paragraph => {
      csvContent.push(paragraph.trim());
    });
    csvContent.push('');
  }

  // Market data table section
  csvContent.push('=== MARKET ANALYSIS DATA ===');
  csvContent.push('');
  
  // Add column headers
  const headers = Object.keys(csvData[0]);
  csvContent.push(headers.join(','));
  
  // Add data rows
  csvData.forEach(row => {
    const rowValues = headers.map(header => {
      const value = row[header as keyof typeof row];
      // Escape quotes and wrap in quotes if contains comma
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvContent.push(rowValues.join(','));
  });

  // Join all content
  const finalCsvContent = csvContent.join('\n');

  // Download CSV
  const blob = new Blob([finalCsvContent], { type: 'text/csv;charset=utf-8;' });
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
