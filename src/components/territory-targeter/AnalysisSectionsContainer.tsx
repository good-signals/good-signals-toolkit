
import React from 'react';
import { TerritoryAnalysis, CBSAData } from '@/types/territoryTargeterTypes';
import CBSATable from './CBSATable';
import ColumnManagement from './ColumnManagement';
import ExportControls from './ExportControls';
import FinalExecutiveSummary from './FinalExecutiveSummary';
import ClearAnalysisDialog from './ClearAnalysisDialog';

interface AnalysisSectionsContainerProps {
  hasAnalysisData: boolean;
  currentAnalysis: TerritoryAnalysis | null;
  cbsaData: CBSAData[];
  accountGoodThreshold?: number | null;
  accountBadThreshold?: number | null;
  refreshingColumnId?: string | null;
  executiveSummary?: string | null;
  isGeneratingSummary: boolean;
  onStatusChange: (cbsaId: string, status: any) => void;
  onManualScoreOverride: (override: any) => void;
  onRefreshColumn: (columnId: string, type: 'all' | 'na-only') => void;
  onToggleColumn: (columnId: string, included: boolean) => void;
  onDeleteColumn: (columnId: string) => void;
  onRenameColumn: (columnId: string, newTitle: string) => void;
  onClearAnalysis: () => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
  onGenerateExecutiveSummary: () => void;
  onUpdateExecutiveSummary: (summary: string) => void;
}

const AnalysisSectionsContainer: React.FC<AnalysisSectionsContainerProps> = ({
  hasAnalysisData,
  currentAnalysis,
  cbsaData,
  accountGoodThreshold,
  accountBadThreshold,
  refreshingColumnId,
  executiveSummary,
  isGeneratingSummary,
  onStatusChange,
  onManualScoreOverride,
  onRefreshColumn,
  onToggleColumn,
  onDeleteColumn,
  onClearAnalysis,
  onExportCSV,
  onExportExcel,
  onGenerateExecutiveSummary,
  onUpdateExecutiveSummary,
  onRenameColumn
}) => {
  // Always show the CBSA table with basic data
  const criteriaColumns = currentAnalysis?.criteriaColumns || [];
  const marketSignalScore = currentAnalysis?.marketSignalScore || 0;

  return (
    <div className="space-y-8">
      {/* Always show the CBSA Table */}
      <CBSATable
        cbsaData={cbsaData}
        criteriaColumns={criteriaColumns}
        marketSignalScore={marketSignalScore}
        accountGoodThreshold={accountGoodThreshold}
        accountBadThreshold={accountBadThreshold}
        onStatusChange={onStatusChange}
        onManualScoreOverride={onManualScoreOverride}
        onRefreshColumn={onRefreshColumn}
        refreshingColumnId={refreshingColumnId}
      />

      {/* Show management and export controls only when we have analysis data */}
      {hasAnalysisData && (
        <>
          <ColumnManagement
            criteriaColumns={criteriaColumns}
            onToggleColumn={onToggleColumn}
            onDeleteColumn={onDeleteColumn}
            onRenameColumn={onRenameColumn}
          />

          <ExportControls
            onClearAnalysis={onClearAnalysis}
            onExportCSV={onExportCSV}
            onExportExcel={onExportExcel}
          />

          <FinalExecutiveSummary
            executiveSummary={executiveSummary}
            isGeneratingSummary={isGeneratingSummary}
            hasAnalysisData={hasAnalysisData}
            onGenerateExecutiveSummary={onGenerateExecutiveSummary}
            onUpdateExecutiveSummary={onUpdateExecutiveSummary}
            cbsaData={cbsaData}
          />
        </>
      )}
    </div>
  );
};

export default AnalysisSectionsContainer;
