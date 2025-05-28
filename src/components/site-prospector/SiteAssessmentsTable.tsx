import React, { useState, useMemo, useEffect } from 'react';
import { Eye, Edit, Loader2, Trash2, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, CheckCircle, Building, Paperclip } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { SiteAssessment } from '@/types/siteAssessmentTypes';
import { useQuery } from '@tanstack/react-query';
import { getAssessmentDocuments, AssessmentDocument } from '@/services/documentService';
import DocumentUpload from './DocumentUpload';

type SortableKeys = 'assessment_name' | 'address_line1' | 'created_at' | 'site_signal_score' | 'completion_percentage' | 'site_status';

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

const getSiteStatusColor = (status: string | null | undefined): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'Prospect': return 'outline';
    case 'LOI': return 'secondary';
    case 'Lease': return 'default';
    case 'Development': return 'secondary';
    case 'Open': return 'default';
    case 'Closed': return 'destructive';
    default: return 'outline';
  }
};

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
  const [showAttachmentsDialog, setShowAttachmentsDialog] = useState(false);
  const [selectedAssessmentForAttachments, setSelectedAssessmentForAttachments] = useState<SiteAssessment | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys | null; direction: 'asc' | 'desc' }>({
    key: 'created_at',
    direction: 'desc',
  });

  const { data: documentsForSelectedAssessment, refetch: refetchDocuments } = useQuery<AssessmentDocument[]>({
    queryKey: ['assessmentDocuments', selectedAssessmentForAttachments?.id],
    queryFn: async () => {
      if (!selectedAssessmentForAttachments?.id) return [];
      return getAssessmentDocuments(selectedAssessmentForAttachments.id);
    },
    enabled: !!selectedAssessmentForAttachments?.id && showAttachmentsDialog,
  });

  useEffect(() => {
    setSelectedAssessmentIds([]);
  }, [forceClearSelectionsKey]);

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
  };

  const handleAttachmentsClick = (assessment: SiteAssessment) => {
    setSelectedAssessmentForAttachments(assessment);
    setShowAttachmentsDialog(true);
  };

  const handleDocumentsChange = () => {
    refetchDocuments();
  };

  useEffect(() => {
    if (!isDeleting && showDeleteDialog) {
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
              <TableHead onClick={() => requestSort('site_status')} className="cursor-pointer hover:bg-muted/50 transition-colors text-center">
                <div className="flex items-center justify-center">
                  <Building className="h-4 w-4 mr-1"/> Status {getSortIcon('site_status')}
                </div>
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
                  <Badge variant={getSiteStatusColor(assessment.site_status)} className="text-sm">
                    {assessment.site_status || 'Prospect'}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {assessment.site_signal_score !== null && assessment.site_signal_score !== undefined ? (
                     <Badge variant={assessment.site_signal_score >= 75 ? "default" : assessment.site_signal_score >= 50 ? "secondary" : "destructive"}>
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
                    onClick={() => handleAttachmentsClick(assessment)}
                    title="Attach Files"
                    disabled={isDeleting}
                  >
                    <Paperclip className="h-4 w-4" />
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

      <Dialog open={showAttachmentsDialog} onOpenChange={setShowAttachmentsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Attachments for {selectedAssessmentForAttachments?.assessment_name || 'Assessment'}
            </DialogTitle>
          </DialogHeader>
          {selectedAssessmentForAttachments && (
            <DocumentUpload
              assessmentId={selectedAssessmentForAttachments.id}
              documents={documentsForSelectedAssessment || []}
              onDocumentsChange={handleDocumentsChange}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SiteAssessmentsTable;
