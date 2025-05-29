
import React, { useState, useMemo } from 'react';
import { Table, TableBody } from '@/components/ui/table';
import { CBSAData, CBSAScore } from '@/types/territoryTargeterTypes';
import CBSATableHeader, { SortConfig } from './table/CBSATableHeader';
import CBSATableRow from './table/CBSATableRow';
import { CBSAStatus } from './table/CBSAStatusSelector';

interface CBSATableProps {
  cbsaData: CBSAData[];
  scores: CBSAScore[];
  marketSignalScore: number;
  accountGoodThreshold?: number | null;
  accountBadThreshold?: number | null;
  onStatusChange?: (cbsaId: string, status: CBSAStatus) => void;
}

const CBSATable: React.FC<CBSATableProps> = ({
  cbsaData,
  scores,
  marketSignalScore,
  accountGoodThreshold,
  accountBadThreshold,
  onStatusChange
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const hasScores = scores.length > 0;

  // Merge CBSA data with scores
  const tableData = useMemo(() => {
    return cbsaData.map(cbsa => {
      const scoreData = scores.find(s => s.market === cbsa.name);
      return {
        ...cbsa,
        score: scoreData?.score || null,
        reasoning: scoreData?.reasoning || null
      };
    });
  }, [cbsaData, scores]);

  // Sort data based on current sort config
  const sortedData = useMemo(() => {
    if (!sortConfig) return tableData;

    return [...tableData].sort((a, b) => {
      let aValue: any = a[sortConfig.key];
      let bValue: any = b[sortConfig.key];

      // Handle null scores
      if (sortConfig.key === 'score') {
        aValue = aValue || 0;
        bValue = bValue || 0;
      }

      // Handle status sorting
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

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <CBSATableHeader 
            hasScores={hasScores} 
            sortConfig={sortConfig} 
            onSort={handleSort} 
          />
          <TableBody>
            {sortedData.map((row) => (
              <CBSATableRow
                key={row.id}
                row={row}
                hasScores={hasScores}
                accountGoodThreshold={accountGoodThreshold}
                accountBadThreshold={accountBadThreshold}
                onStatusChange={handleStatusChange}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CBSATable;
