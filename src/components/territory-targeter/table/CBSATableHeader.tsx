
import React from 'react';
import { Button } from '@/components/ui/button';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { CriteriaColumn } from '@/types/territoryTargeterTypes';
import ColumnRefreshOptions from '../ColumnRefreshOptions';

export type SortConfig = {
  key: 'name' | 'state' | 'region' | 'population' | 'populationGrowth' | 'status' | string;
  direction: 'asc' | 'desc';
} | null;

interface CBSATableHeaderProps {
  hasScores: boolean;
  criteriaColumns: CriteriaColumn[];
  sortConfig: SortConfig;
  onSort: (key: SortConfig['key']) => void;
  onRefreshColumn?: (columnId: string, type: 'all' | 'na-only') => void;
  isRefreshing?: boolean;
}

const CBSATableHeader: React.FC<CBSATableHeaderProps> = ({
  hasScores,
  criteriaColumns,
  sortConfig,
  onSort,
  onRefreshColumn,
  isRefreshing = false
}) => {
  const getSortIcon = (key: SortConfig['key']) => {
    if (sortConfig?.key !== key) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4" />
      : <ArrowDown className="h-4 w-4" />;
  };

  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-[200px]">
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
          const columnHasNA = column.scores.some(score => 
            score.score === null || score.score === undefined
          );
          
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
                    disabled={isRefreshing}
                  />
                )}
              </div>
            </TableHead>
          );
        })}
        {hasScores && (
          <TableHead className="min-w-[300px]">
            Combined Reasoning
          </TableHead>
        )}
      </TableRow>
    </TableHeader>
  );
};

export default CBSATableHeader;
