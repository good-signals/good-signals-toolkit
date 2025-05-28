
import React, { useState, useMemo, useEffect } from 'react';
import { Eye, Edit, Loader2, Trash2, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { SiteAssessment } from '@/types/siteAssessmentTypes';

type SortableKeys = 'assessment_name' | 'address_line1' | 'created_at' | 'site_signal_score' | 'completion_percentage';

interface SiteAssessmentsTableProps {
  assessmentsData: SiteAssessment[];
  isLoading: boolean;
  errorLoading: Error | null;
  onViewDetails: (assessment: SiteAssessment) => void;
  onEdit: (assessment: SiteAssessment) => void;
  onDeleteCommit: (idsToDelete: string[]) => void;
  isDeleting: boolean;
  forceClearSelectionsKey: string | number;
}

const SiteAssessmentsTable: React.FC<SiteAssessmentsTableProps> = ({
  assessmentsData,
  isLoading,
  errorLoading,
  onViewDetails,
  onEdit,
  onDeleteCommit,
  isDeleting,
  forceClearSelectionsKey,
}) => {
  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState<string[]>([]);
  const [assessmentToDelete, setAssessmentToDelete] = useState<SiteAssessment | null>(null);
  const [assessmentsToDeleteList, setAssessmentsToDeleteList] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys | null; direction: 'asc' | 'desc' }>({
    key: 'created_at',
    direction: 'desc',
  });

  useEffect(() => {
    setSelectedAssessmentIds([]);
  }, [forceClearSelectionsKey]);

  // Reset selections if the underlying data changes significantly (e.g., after filtering or full refresh)
  useEffect(() => {
    setSelectedAssessmentIds(prevSelected =>
      prevSelected.filter(id => assessmentsData.some(a => a.id === id))
    );
  }, [assessmentsData]);

  const requestSort = (key: SortableKeys) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedAssessments = useMemo(() => {
    let sortableItems = [...assessmentsData];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key!];
        const valB = b[sortConfig.key!];

        if (valA === null || valA === undefined) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valB === null || valB === undefined) return sortConfig.direction === 'asc' ? 1 : -1;
        
        if (typeof valA === 'string' && typeof valB === 'string') {
          return valA.localeCompare(valB) * (sortConfig.direction === 'asc' ? 1 : -1);
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
          return (valA < valB ? -1 : valA > valB ? 1 : 0) * (sortConfig.direction === 'asc' ? 1 : -1);
        }
        if (sortConfig.key === 'created_at') {
            const dateA = new Date(valA as string).getTime();
            const dateB = new Date(valB as string).getTime();
            return (dateA < dateB ? -1 : dateA > dateB ? 1 : 0) * (sortConfig.direction === 'asc' ? 1 : -1);
        }
        return 0;
      });
    }
    return sortableItems;
  }, [assessmentsData, sortConfig]);
  
  const getSortIcon = (columnKey: SortableKeys) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="ml-2 h-4 w-4" /> : 
      <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedAssessmentIds(sortedAssessments.map(a => a.id));
    } else {
      setSelectedAssessmentIds([]);
    }
  };

  const handleSelectRow = (assessmentId: string, checked: boolean) => {
    setSelectedAssessmentIds(prev =>
      checked ? [...prev, assessmentId] : prev.filter(id => id !== assessmentId)
    );
  };

  const openDeleteDialog = (item: SiteAssessment | string[]) => {
    if (Array.isArray(item)) {
      setAssessmentsToDeleteList(item);
      setAssessmentToDelete(null);
    } else {
      setAssessmentToDelete(item);
      setAssessmentsToDeleteList([]);
    }
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    const idsToDelete = assessmentToDelete ? [assessmentToDelete.id] : assessmentsToDeleteList;
    if (idsToDelete.length === 0) return;
    onDeleteCommit(idsToDelete);
    // Dialog will be closed by parent or by isDeleting prop change effect if needed
    // Selections will be cleared by forceClearSelectionsKey effect
  };

  // Close dialog when delete operation finishes (isDeleting becomes false)
   useEffect(() => {
    if (!isDeleting && showDeleteDialog) {
      // Check if it was a real delete attempt that finished
      // This is tricky, might need a flag if delete was initiated from this component
      // For now, let's assume parent handles toasts and we just close dialog
      // The success of deletion will trigger forceClearSelectionsKey which clears selection
      setShowDeleteDialog(false);
      setAssessmentToDelete(null);
      setAssessmentsToDeleteList([]);
    }
  }, [isDeleting, showDeleteDialog]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
        <p className="text-muted-foreground">Loading assessments...</p>
      </div>
    );
  }

  if (errorLoading) {
    return <p className="text-destructive py-10 text-center">Error loading assessments: {errorLoading.message}</p>;
  }

  if (sortedAssessments.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center">
        You haven't started any site assessments yet. Click "Start New Site Assessment" to begin!
      </p>
    );
  }

  return (
    <div className="mt-10 p-6 border border-border rounded-lg bg-card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-card-foreground">My Site Assessments</h2>
        {selectedAssessmentIds.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => openDeleteDialog(selectedAssessmentIds)}
            disabled={isDeleting}
          >
            {isDeleting && assessmentsToDeleteList.length > 0 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Delete Selected ({selectedAssessmentIds.length})
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={
                    selectedAssessmentIds.length === sortedAssessments.length && sortedAssessments.length > 0
                      ? true
                      : selectedAssessmentIds.length > 0
                      ? "indeterminate"
                      : false
                  }
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all assessments"
                  disabled={isDeleting}
                />
              </TableHead>
              <TableHead onClick={() => requestSort('assessment_name')} className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center">Name {getSortIcon('assessment_name')}</div>
              </TableHead>
              <TableHead onClick={() => requestSort('address_line1')} className="cursor-pointer hover:bg-muted/50 transition-colors min-w-[200px]">
                <div className="flex items-center">Address {getSortIcon('address_line1')}</div>
              </TableHead>
              <TableHead onClick={() => requestSort('site_signal_score')} className="cursor-pointer hover:bg-muted/50 transition-colors text-center">
                <div className="flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 mr-1"/> Score {getSortIcon('site_signal_score')}
                </div>
              </TableHead>
              <TableHead onClick={() => requestSort('completion_percentage')} className="cursor-pointer hover:bg-muted/50 transition-colors text-center">
                <div className="flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 mr-1"/> Completion {getSortIcon('completion_percentage')}
                </div>
              </TableHead>
              <TableHead onClick={() => requestSort('created_at')} className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center">Created {getSortIcon('created_at')}</div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAssessments.map((assessment) => (
              <TableRow 
                key={assessment.id}
                data-state={selectedAssessmentIds.includes(assessment.id) ? "selected" : undefined}
                className={selectedAssessmentIds.includes(assessment.id) ? "bg-muted/50" : ""}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedAssessmentIds.includes(assessment.id)}
                    onCheckedChange={(checked) => handleSelectRow(assessment.id, !!checked)}
                    aria-label={`Select assessment ${assessment.assessment_name || assessment.id}`}
                    disabled={isDeleting}
                  />
                </TableCell>
                <TableCell className="font-medium">{assessment.assessment_name || 'N/A'}</TableCell>
                <TableCell>
                  {assessment.address_line1 || ''}
                  {assessment.address_line1 && assessment.city ? ', ' : ''}
                  {assessment.city || ''}
                </TableCell>
                <TableCell className="text-center">
                  {assessment.site_signal_score !== null && assessment.site_signal_score !== undefined ? (
                     <Badge variant={assessment.site_signal_score >= 75 ? "success" : assessment.site_signal_score >= 50 ? "secondary" : "destructive"}>
                      {assessment.site_signal_score}%
                     </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">N/A</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {assessment.completion_percentage !== null && assessment.completion_percentage !== undefined ? (
                    <span>{assessment.completion_percentage}%</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">N/A</span>
                  )}
                </TableCell>
                <TableCell>{new Date(assessment.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => onViewDetails(assessment)}
                    disabled={!assessment.target_metric_set_id || isDeleting}
                    title={!assessment.target_metric_set_id ? "Select a metric set to view details" : "View Details"}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => onEdit(assessment)}
                    title="Edit Assessment"
                    disabled={isDeleting}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-destructive border-destructive hover:bg-destructive/90 hover:text-destructive-foreground"
                    onClick={() => openDeleteDialog(assessment)}
                    title="Delete Assessment"
                    disabled={isDeleting && assessmentToDelete?.id === assessment.id}
                  >
                    {isDeleting && assessmentToDelete?.id === assessment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete?</AlertDialogTitle>
            <AlertDialogDescription>
              {assessmentToDelete
                ? `This will permanently delete the assessment "${assessmentToDelete.assessment_name || assessmentToDelete.id}".`
                : `This will permanently delete ${assessmentsToDeleteList.length} selected assessment(s).`}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowDeleteDialog(false); setAssessmentToDelete(null); setAssessmentsToDeleteList([]); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SiteAssessmentsTable;

