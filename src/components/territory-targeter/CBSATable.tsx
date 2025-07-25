import React, { useState, useMemo } from 'react';
import { Table, TableBody } from '@/components/ui/table';
import { CBSAData, CriteriaColumn, ManualScoreOverride } from '@/types/territoryTargeterTypes';
import CBSATableHeader, { SortConfig } from './table/CBSATableHeader';
import CBSATableRow from './table/CBSATableRow';
import ManualScoreOverrideDialog from './ManualScoreOverride';
import { CBSAStatus } from './table/CBSAStatusSelector';

interface CBSATableProps {
  cbsaData: CBSAData[];
  criteriaColumns: CriteriaColumn[];
  marketSignalScore: number;
  accountGoodThreshold?: number | null;
  accountBadThreshold?: number | null;
  onStatusChange?: (cbsaId: string, status: CBSAStatus) => void;
  onManualScoreOverride?: (override: ManualScoreOverride) => void;
  onRefreshColumn?: (columnId: string, type: 'all' | 'na-only') => void;
  refreshingColumnId?: string | null;
}

const CBSATable: React.FC<CBSATableProps> = ({
  cbsaData,
  criteriaColumns,
  marketSignalScore,
  accountGoodThreshold,
  accountBadThreshold,
  onStatusChange,
  onManualScoreOverride,
  onRefreshColumn,
  refreshingColumnId = null
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [overrideDialog, setOverrideDialog] = useState<{
    isOpen: boolean;
    marketName: string;
    columnId: string;
    columnTitle: string;
    currentScore?: number;
    currentReasoning?: string;
  }>({
    isOpen: false,
    marketName: '',
    columnId: '',
    columnTitle: ''
  });

  const hasScores = criteriaColumns.length > 0;

  // Merge CBSA data with scores from all criteria columns
  const tableData = useMemo(() => {
    return cbsaData.map(cbsa => {
      const criteriaScores: { [columnId: string]: { score: number | null; reasoning: string | null; sources?: string[] } } = {};
      
      // Only process criteria columns if they exist
      if (hasScores) {
        criteriaColumns.forEach(column => {
          const scoreData = column.scores.find(s => s.market === cbsa.name);
          criteriaScores[column.id] = {
            score: scoreData?.score || null,
            reasoning: scoreData?.reasoning || null,
            sources: scoreData?.sources
          };
        });
      }

      // Calculate market signal score only if we have criteria columns
      let marketSignalScore = null;
      if (hasScores) {
        const includedScores = Object.entries(criteriaScores)
          .filter(([columnId]) => {
            const column = criteriaColumns.find(c => c.id === columnId);
            return column && column.isIncludedInSignalScore !== false;
          })
          .map(([_, scoreData]) => scoreData.score)
          .filter(score => score !== null) as number[];
        
        marketSignalScore = includedScores.length > 0 
          ? includedScores.reduce((sum, score) => sum + score, 0) / includedScores.length
          : null;
      }

      // Ensure all required properties are present with defaults
      return {
        id: cbsa.id || `cbsa-${Math.random().toString(36).substr(2, 9)}`,
        name: cbsa.name || 'Unknown',
        state: cbsa.state || 'Unknown',
        region: cbsa.region || 'Unknown',
        population: cbsa.population || 0,
        populationGrowth: cbsa.populationGrowth || 0,
        status: cbsa.status as CBSAStatus,
        criteriaScores,
        marketSignalScore
      };
    });
  }, [cbsaData, criteriaColumns, hasScores]);

  // Sort data based on current sort config
  const sortedData = useMemo(() => {
    if (!sortConfig) return tableData;

    return [...tableData].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortConfig.key === 'marketSignalScore') {
        aValue = a.marketSignalScore || 0;
        bValue = b.marketSignalScore || 0;
      } else if (sortConfig.key.startsWith('criteria_')) {
        const columnId = sortConfig.key.replace('criteria_', '');
        aValue = a.criteriaScores[columnId]?.score || 0;
        bValue = b.criteriaScores[columnId]?.score || 0;
      } else {
        aValue = a[sortConfig.key as keyof typeof a];
        bValue = b[sortConfig.key as keyof typeof b];
      }

      // Handle null scores and status sorting
      if (sortConfig.key === 'status') {
        aValue = aValue || '';
        bValue = bValue || '';
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [tableData, sortConfig]);

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const handleStatusChange = (cbsaId: string, status: CBSAStatus) => {
    if (onStatusChange) {
      onStatusChange(cbsaId, status);
    }
  };

  const handleScoreClick = (marketName: string, columnId: string) => {
    const column = criteriaColumns.find(c => c.id === columnId);
    if (!column) return;

    const row = tableData.find(r => r.name === marketName);
    const scoreData = row?.criteriaScores[columnId];

    setOverrideDialog({
      isOpen: true,
      marketName,
      columnId,
      columnTitle: column.title,
      currentScore: scoreData?.score || undefined,
      currentReasoning: scoreData?.reasoning || undefined
    });
  };

  const handleOverrideSave = (override: ManualScoreOverride) => {
    if (onManualScoreOverride) {
      onManualScoreOverride(override);
    }
  };

  const handleRefreshColumn = (columnId: string, type: 'all' | 'na-only') => {
    if (onRefreshColumn) {
      onRefreshColumn(columnId, type);
    }
  };

  return (
    <div className="space-y-4">
      {/* Table Title */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-foreground">Territory Analysis</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {hasScores 
            ? "Core-Based Statistical Areas ranked by population and custom criteria scoring"
            : "Core-Based Statistical Areas ranked by population - run an analysis to add custom scoring"
          }
        </p>
      </div>

      {/* Table with sticky header */}
      <div className="relative border rounded-lg overflow-hidden">
        <div className="max-h-[600px] overflow-auto">
          <table className="w-full caption-bottom text-sm relative">
            <CBSATableHeader 
              hasScores={hasScores}
              criteriaColumns={criteriaColumns}
              tableData={tableData}
              sortConfig={sortConfig} 
              onSort={handleSort}
              onRefreshColumn={handleRefreshColumn}
              refreshingColumnId={refreshingColumnId}
            />
            <tbody className="[&_tr:last-child]:border-0">
              {sortedData.map((row, index) => (
                <CBSATableRow
                  key={row.id}
                  row={row}
                  criteriaColumns={criteriaColumns}
                  accountGoodThreshold={accountGoodThreshold}
                  accountBadThreshold={accountBadThreshold}
                  onStatusChange={handleStatusChange}
                  onScoreClick={handleScoreClick}
                  isEvenRow={index % 2 === 0}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Score Override Dialog - only show if we have criteria columns */}
      {hasScores && (
        <ManualScoreOverrideDialog
          isOpen={overrideDialog.isOpen}
          onClose={() => setOverrideDialog(prev => ({ ...prev, isOpen: false }))}
          onSave={handleOverrideSave}
          marketName={overrideDialog.marketName}
          columnId={overrideDialog.columnId}
          columnTitle={overrideDialog.columnTitle}
          currentScore={overrideDialog.currentScore}
          currentReasoning={overrideDialog.currentReasoning}
        />
      )}
    </div>
  );
};

export default CBSATable;
