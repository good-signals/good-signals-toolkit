
import React, { useState, useMemo, useEffect } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { SiteAssessment } from '@/types/siteAssessmentTypes';
import { useQuery } from '@tanstack/react-query';
import { getAssessmentDocuments, AssessmentDocument } from '@/services/documentService';
import DocumentUpload from './DocumentUpload';
import SiteAssessmentsTableContent from './table/SiteAssessmentsTableContent';

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

  // Query to get document counts for all assessments
  const { data: documentCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ['assessmentDocumentCounts', assessmentsData.map(a => a.id)],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      await Promise.all(
        assessmentsData.map(async (assessment) => {
          try {
            const documents = await getAssessmentDocuments(assessment.id);
            counts[assessment.id] = documents.length;
          } catch (error) {
            console.error(`Error fetching documents for assessment ${assessment.id}:`, error);
            counts[assessment.id] = 0;
          }
        })
      );
      return counts;
    },
    enabled: assessmentsData.length > 0,
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
    console.log('Opening delete dialog for:', item);
    if (Array.isArray(item)) {
      if (item.length === 0) {
        console.log('No assessments selected for deletion');
        return;
      }
      setAssessmentsToDeleteList(item);
      setAssessmentToDelete(null);
    } else {
      setAssessmentToDelete(item);
      setAssessmentsToDeleteList([]);
    }
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    console.log('Confirming delete...');
    const idsToDelete = assessmentToDelete ? [assessmentToDelete.id] : assessmentsToDeleteList;
    console.log('IDs to delete:', idsToDelete);
    
    if (idsToDelete.length === 0) {
      console.log('No assessments to delete');
      return;
    }
    
    // Clear the dialog state immediately
    setShowDeleteDialog(false);
    setAssessmentToDelete(null);
    setAssessmentsToDeleteList([]);
    
    // Call the deletion handler
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
      
      <SiteAssessmentsTableContent
        assessments={sortedAssessments}
        selectedAssessmentIds={selectedAssessmentIds}
        sortConfig={sortConfig}
        onSort={requestSort}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        onViewDetails={onViewDetails}
        onEdit={onEdit}
        onDelete={openDeleteDialog}
        onAttachmentsClick={handleAttachmentsClick}
        isDeleting={isDeleting}
        assessmentToDelete={assessmentToDelete}
        documentCounts={documentCounts}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete?</AlertDialogTitle>
            <AlertDialogDescription>
              {assessmentToDelete
                ? `This will permanently delete the assessment "${assessmentToDelete.assessment_name || assessmentToDelete.id}" and all associated data (metric values, site visit ratings, and documents).`
                : `This will permanently delete ${assessmentsToDeleteList.length} selected assessment(s) and all associated data.`}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { 
              setShowDeleteDialog(false); 
              setAssessmentToDelete(null); 
              setAssessmentsToDeleteList([]); 
            }}>
              Cancel
            </AlertDialogCancel>
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
