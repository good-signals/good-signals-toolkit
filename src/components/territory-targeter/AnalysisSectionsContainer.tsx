
import React from 'react';
import { CBSAData, TerritoryAnalysis, ManualScoreOverride } from '@/types/territoryTargeterTypes';
import { CBSAStatus } from './table/CBSAStatusSelector';
import ExecutiveSummary from './ExecutiveSummary';
import ColumnManagement from './ColumnManagement';
import ExportControls from './ExportControls';
import CBSATable from './CBSATable';

interface AnalysisSectionsContainerProps {
  hasAnalysisData: boolean;
  currentAnalysis: TerritoryAnalysis;
  cbsaData: CBSAData[];
  accountGoodThreshold?: number | null;
  accountBadThreshold?: number | null;
  refreshingColumnId?: string | null;
  onStatusChange: (cbsaId: string, status: CBSAStatus) => void;
  onManualScoreOverride: (override: ManualScoreOverride) => void;
  onRefreshColumn: (columnId: string, type: 'all' | 'na-only') => void;
  onToggleColumn: (columnId: string, included: boolean) => void;
  onDeleteColumn: (columnId: string) => void;
  onClearAnalysis: () => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
}

const AnalysisSectionsContainer: React.FC<AnalysisSectionsContainerProps> = ({
  hasAnalysisData,
  currentAnalysis,
  cbsaData,
  accountGoodThreshold,
  accountBadThreshold,
  refreshingColumnId,
  onStatusChange,
  onManualScoreOverride,
  onRefreshColumn,
  onToggleColumn,
  onDeleteColumn,
  onClearAnalysis,
  onExportCSV,
  onExportExcel
}) => {
  if (!hasAnalysisData) return null;

  return (
    <>
      {/* AI Logic Summary */}
      <ExecutiveSummary
        criteriaColumns={currentAnalysis.criteriaColumns}
      />

      {/* Column Management */}
      <ColumnManagement
        criteriaColumns={currentAnalysis.criteriaColumns}
        onToggleColumn={onToggleColumn}
        onDeleteColumn={onDeleteColumn}
      />

      {/* Export Controls */}
      <ExportControls
        onClearAnalysis={onClearAnalysis}
        onExportCSV={onExportCSV}
        onExportExcel={onExportExcel}
      />

      {/* Results Table */}
      <div className="mt-6">
        <CBSATable
          cbsaData={cbsaData}
          criteriaColumns={currentAnalysis.criteriaColumns}
          marketSignalScore={currentAnalysis.marketSignalScore || 0}
          accountGoodThreshold={accountGoodThreshold}
          accountBadThreshold={accountBadThreshold}
          onStatusChange={onStatusChange}
          onManualScoreOverride={onManualScoreOverride}
          onRefreshColumn={onRefreshColumn}
          refreshingColumnId={refreshingColumnId}
        />
      </div>
    </>
  );
};

export default AnalysisSectionsContainer;
