
import React from 'react';
import { Button } from '@/components/ui/button';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { CriteriaColumn, CBSATableRowData } from '@/types/territoryTargeterTypes';
import ColumnRefreshOptions from '../ColumnRefreshOptions';
import { cn } from '@/lib/utils';

export type SortConfig = {
  key: 'name' | 'state' | 'region' | 'population' | 'populationGrowth' | 'status' | 'marketSignalScore' | string;
  direction: 'asc' | 'desc';
} | null;

interface CBSATableHeaderProps {
  hasScores: boolean;
  criteriaColumns: CriteriaColumn[];
  tableData: CBSATableRowData[];
  sortConfig: SortConfig;
  onSort: (key: SortConfig['key']) => void;
  onRefreshColumn?: (columnId: string, type: 'all' | 'na-only') => void;
  refreshingColumnId?: string | null;
  className?: string;
}

const CBSATableHeader: React.FC<CBSATableHeaderProps> = ({
  hasScores,
  criteriaColumns,
  tableData,
  sortConfig,
  onSort,
  onRefreshColumn,
  refreshingColumnId = null,
  className
}) => {
  const getSortIcon = (key: SortConfig['key']) => {
    if (sortConfig?.key !== key) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4" />
      : <ArrowDown className="h-4 w-4" />;
  };

  const showMarketSignalScore = hasScores && criteriaColumns.length > 1;

  return (
    <TableHeader className={cn("sticky top-0 z-20 bg-background", className)}>
      <TableRow>
        <TableHead className="w-[200px] sticky left-0 z-10 bg-background border-r">
          <Button 
            variant="ghost" 
            onClick={() => onSort('name')}
            className="h-auto p-0 font-medium"
          >
            CBSA Name
            {getSortIcon('name')}
          </Button>
        </TableHead>
        <TableHead className="w-[80px]">
          <Button 
            variant="ghost" 
            onClick={() => onSort('state')}
            className="h-auto p-0 font-medium"
          >
            State
            {getSortIcon('state')}
          </Button>
        </TableHead>
        <TableHead className="w-[120px]">
          <Button 
            variant="ghost" 
            onClick={() => onSort('region')}
            className="h-auto p-0 font-medium"
          >
            Region
            {getSortIcon('region')}
          </Button>
        </TableHead>
        <TableHead className="w-[120px]">
          <Button 
            variant="ghost" 
            onClick={() => onSort('status')}
            className="h-auto p-0 font-medium"
          >
            Status
            {getSortIcon('status')}
          </Button>
        </TableHead>
        <TableHead className="w-[120px] text-right">
          <Button 
            variant="ghost" 
            onClick={() => onSort('population')}
            className="h-auto p-0 font-medium"
          >
            Population
            {getSortIcon('population')}
          </Button>
        </TableHead>
        <TableHead className="w-[100px] text-right">
          <Button 
            variant="ghost" 
            onClick={() => onSort('populationGrowth')}
            className="h-auto p-0 font-medium"
          >
            Growth
            {getSortIcon('populationGrowth')}
          </Button>
        </TableHead>
        {hasScores && criteriaColumns.map((column) => {
          // Check for N/A values in the actual table data being displayed
          const columnHasNA = tableData.some(row => 
            row.criteriaScores[column.id]?.score === null || 
            row.criteriaScores[column.id]?.score === undefined
          );
          
          const isThisColumnRefreshing = refreshingColumnId === column.id;
          
          return (
            <TableHead key={column.id} className="w-[150px] text-center">
              <div className="flex items-center justify-between">
                <Button 
                  variant="ghost" 
                  onClick={() => onSort(`criteria_${column.id}`)}
                  className="h-auto p-0 font-medium flex-1 justify-start"
                >
                  {column.title}
                  {getSortIcon(`criteria_${column.id}`)}
                </Button>
                {onRefreshColumn && (
                  <ColumnRefreshOptions
                    columnId={column.id}
                    columnTitle={column.title}
                    hasNAValues={columnHasNA}
                    onRefreshColumn={onRefreshColumn}
                    disabled={isThisColumnRefreshing}
                  />
                )}
              </div>
            </TableHead>
          );
        })}
        {showMarketSignalScore && (
          <TableHead className="w-[150px] text-center">
            <Button 
              variant="ghost" 
              onClick={() => onSort('marketSignalScore')}
              className="h-auto p-0 font-medium text-blue-600"
            >
              Market Signal Score
              {getSortIcon('marketSignalScore')}
            </Button>
          </TableHead>
        )}
        {hasScores && (
          <TableHead className="min-w-[900px]">
            Combined Reasoning
          </TableHead>
        )}
      </TableRow>
    </TableHeader>
  );
};

export default CBSATableHeader;
