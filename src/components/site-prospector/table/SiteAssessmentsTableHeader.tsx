
import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, CheckCircle, Building } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import {
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SortableKeys = 'assessment_name' | 'address_line1' | 'created_at' | 'site_signal_score' | 'completion_percentage' | 'site_status';

interface SiteAssessmentsTableHeaderProps {
  sortConfig: { key: SortableKeys | null; direction: 'asc' | 'desc' };
  onSort: (key: SortableKeys) => void;
  selectedCount: number;
  totalCount: number;
  onSelectAll: (checked: boolean | 'indeterminate') => void;
  isDeleting: boolean;
}

const SiteAssessmentsTableHeader: React.FC<SiteAssessmentsTableHeaderProps> = ({
  sortConfig,
  onSort,
  selectedCount,
  totalCount,
  onSelectAll,
  isDeleting,
}) => {
  const getSortIcon = (columnKey: SortableKeys) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="ml-2 h-4 w-4" /> : 
      <ArrowDown className="ml-2 h-4 w-4" />;
  };

  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-[50px]">
          <Checkbox
            checked={
              selectedCount === totalCount && totalCount > 0
                ? true
                : selectedCount > 0
                ? "indeterminate"
                : false
            }
            onCheckedChange={onSelectAll}
            aria-label="Select all assessments"
            disabled={isDeleting}
          />
        </TableHead>
        <TableHead onClick={() => onSort('assessment_name')} className="cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex items-center">Name {getSortIcon('assessment_name')}</div>
        </TableHead>
        <TableHead onClick={() => onSort('address_line1')} className="cursor-pointer hover:bg-muted/50 transition-colors min-w-[200px]">
          <div className="flex items-center">Address {getSortIcon('address_line1')}</div>
        </TableHead>
        <TableHead onClick={() => onSort('site_status')} className="cursor-pointer hover:bg-muted/50 transition-colors text-center">
          <div className="flex items-center justify-center">
            <Building className="h-4 w-4 mr-1"/> Status {getSortIcon('site_status')}
          </div>
        </TableHead>
        <TableHead onClick={() => onSort('site_signal_score')} className="cursor-pointer hover:bg-muted/50 transition-colors text-center">
          <div className="flex items-center justify-center">
            <TrendingUp className="h-4 w-4 mr-1"/> Score {getSortIcon('site_signal_score')}
          </div>
        </TableHead>
        <TableHead onClick={() => onSort('completion_percentage')} className="cursor-pointer hover:bg-muted/50 transition-colors text-center">
          <div className="flex items-center justify-center">
            <CheckCircle className="h-4 w-4 mr-1"/> Completion {getSortIcon('completion_percentage')}
          </div>
        </TableHead>
        <TableHead onClick={() => onSort('created_at')} className="cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex items-center">Created {getSortIcon('created_at')}</div>
        </TableHead>
        <TableHead className="text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
};

export default SiteAssessmentsTableHeader;
