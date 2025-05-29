
import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { RefreshCw, MoreVertical } from 'lucide-react';

interface ColumnRefreshOptionsProps {
  columnId: string;
  columnTitle: string;
  hasNAValues: boolean;
  onRefreshColumn: (columnId: string, type: 'all' | 'na-only') => void;
  disabled?: boolean;
}

const ColumnRefreshOptions: React.FC<ColumnRefreshOptionsProps> = ({
  columnId,
  columnTitle,
  hasNAValues,
  onRefreshColumn,
  disabled = false
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={disabled}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => onRefreshColumn(columnId, 'all')}
          disabled={disabled}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh All Scores
        </DropdownMenuItem>
        {hasNAValues && (
          <DropdownMenuItem 
            onClick={() => onRefreshColumn(columnId, 'na-only')}
            disabled={disabled}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh N/A Only
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ColumnRefreshOptions;
