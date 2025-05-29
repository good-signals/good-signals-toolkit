
import React from 'react';
import { Button } from '@/components/ui/button';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export type SortConfig = {
  key: 'name' | 'state' | 'region' | 'population' | 'populationGrowth' | 'score' | 'reasoning' | 'status';
  direction: 'asc' | 'desc';
} | null;

interface CBSATableHeaderProps {
  hasScores: boolean;
  sortConfig: SortConfig;
  onSort: (key: SortConfig['key']) => void;
}

const CBSATableHeader: React.FC<CBSATableHeaderProps> = ({
  hasScores,
  sortConfig,
  onSort
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
        {hasScores && (
          <>
            <TableHead className="w-[100px] text-center">
              <Button 
                variant="ghost" 
                onClick={() => onSort('score')}
                className="h-auto p-0 font-medium"
              >
                Score
                {getSortIcon('score')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[300px]">
              <Button 
                variant="ghost" 
                onClick={() => onSort('reasoning')}
                className="h-auto p-0 font-medium"
              >
                AI Reasoning
                {getSortIcon('reasoning')}
              </Button>
            </TableHead>
          </>
        )}
      </TableRow>
    </TableHeader>
  );
};

export default CBSATableHeader;
