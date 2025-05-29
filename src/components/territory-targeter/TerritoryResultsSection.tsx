
import React from 'react';
import ExecutiveSummary from './ExecutiveSummary';
import TerritoryExecutiveSummary from './TerritoryExecutiveSummary';
import ColumnManagement from './ColumnManagement';
import ExportControls from './ExportControls';
import { TerritoryAnalysis, CBSAData } from '@/types/territoryTargeterTypes';

interface TerritoryResultsSectionProps {
  currentAnalysis: TerritoryAnalysis;
  cbsaData: CBSAData[];
  executiveSummary: string;
  isGeneratingSummary: boolean;
  onGenerateSummary: () => Promise<void>;
  onToggleColumn: (columnId: string, included: boolean) => void;
  onDeleteColumn: (columnId: string) => void;
  onClearAnalysis: () => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
}

const TerritoryResultsSection: React.FC<TerritoryResultsSectionProps> = ({
  currentAnalysis,
  cbsaData,
  executiveSummary,
  isGeneratingSummary,
  onGenerateSummary,
  onToggleColumn,
  onDeleteColumn,
  onClearAnalysis,
  onExportCSV,
  onExportExcel
}) => {
  return (
    <>
      <ExecutiveSummary 
        criteriaColumns={currentAnalysis.criteriaColumns}
      />

      <TerritoryExecutiveSummary
        analysis={currentAnalysis}
        cbsaData={cbsaData}
        onGenerateSummary={onGenerateSummary}
        isGenerating={isGeneratingSummary}
        executiveSummary={executiveSummary}
      />

      <ColumnManagement
        criteriaColumns={currentAnalysis.criteriaColumns}
        onToggleColumn={onToggleColumn}
        onDeleteColumn={onDeleteColumn}
      />

      <ExportControls
        onClearAnalysis={onClearAnalysis}
        onExportCSV={onExportCSV}
        onExportExcel={onExportExcel}
      />
    </>
  );
};

export default TerritoryResultsSection;
