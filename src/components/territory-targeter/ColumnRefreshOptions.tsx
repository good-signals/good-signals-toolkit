
import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { MoreHorizontal, RotateCcw, Trash2, ToggleLeft } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ColumnRefreshOptionsProps {
  columnId: string;
  columnTitle: string;
  hasNAValues: boolean;
  isIncludedInSignalScore?: boolean;
  onRefreshColumn: (columnId: string, type: 'all' | 'na-only') => void;
  onToggleColumn?: (columnId: string, included: boolean) => void;
  onDeleteColumn?: (columnId: string) => void;
  disabled?: boolean;
}

const ColumnRefreshOptions: React.FC<ColumnRefreshOptionsProps> = ({
  columnId,
  columnTitle,
  hasNAValues,
  isIncludedInSignalScore = true,
  onRefreshColumn,
  onToggleColumn,
  onDeleteColumn,
  disabled = false
}) => {
  const handleToggleChange = (checked: boolean) => {
    if (onToggleColumn) {
      onToggleColumn(columnId, checked);
    }
  };

  const handleDelete = () => {
    if (onDeleteColumn) {
      onDeleteColumn(columnId);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0"
          disabled={disabled}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Column Options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {onToggleColumn && (
          <>
            <div className="flex items-center justify-between px-2 py-2">
              <div className="flex items-center gap-2">
                <ToggleLeft className="h-4 w-4" />
                <span className="text-sm">Include in Signal Score</span>
              </div>
              <Switch
                checked={isIncludedInSignalScore}
                onCheckedChange={handleToggleChange}
              />
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        
        <DropdownMenuItem 
          onClick={() => onRefreshColumn(columnId, 'all')}
          disabled={disabled}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Refresh All Scores
        </DropdownMenuItem>
        
        {hasNAValues && (
          <DropdownMenuItem 
            onClick={() => onRefreshColumn(columnId, 'na-only')}
            disabled={disabled}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Refresh N/A Scores Only
          </DropdownMenuItem>
        )}
        
        {onDeleteColumn && (
          <>
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onSelect={(e) => e.preventDefault()}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Column
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Criteria Column</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{columnTitle}"? This action cannot be undone and will remove all scores and data for this criteria.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ColumnRefreshOptions;
