import React, { useState, useMemo } from 'react';
import { BarChart3, PlusCircle, Eye, Edit, Loader2, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Save, TrendingUp, CheckCircle } from 'lucide-react'; // Added TrendingUp, CheckCircle
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
import NewAssessmentForm from '@/components/site-prospector/NewAssessmentForm';
import SelectTargetMetricSetStep from '@/components/site-prospector/SelectTargetMetricSetStep';
import InputMetricValuesStep from '@/components/site-prospector/InputMetricValuesStep';
import SiteAssessmentDetailsView from '@/components/site-prospector/SiteAssessmentDetailsView';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSiteAssessmentsForUser, deleteSiteAssessment } from '@/services/siteAssessmentService';
import { SiteAssessment } from '@/types/siteAssessmentTypes';
import { toast } from "@/components/ui/use-toast";
import { Badge } from '@/components/ui/badge'; // Added Badge for scores

type AssessmentStep = 'idle' | 'newAddress' | 'selectMetrics' | 'inputMetrics' | 'inputSiteVisitRatings' | 'assessmentDetails';
type SortableKeys = 'assessment_name' | 'address_line1' | 'created_at' | 'site_signal_score' | 'completion_percentage'; // Added new sortable keys

const SiteProspectorPage = () => {
  const [currentStep, setCurrentStep] = useState<AssessmentStep>('idle');
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);
  const [selectedMetricSetId, setSelectedMetricSetId] = useState<string | null>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState<string[]>([]);
  const [assessmentToDelete, setAssessmentToDelete] = useState<SiteAssessment | null>(null);
  const [assessmentsToDeleteList, setAssessmentsToDeleteList] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys | null; direction: 'asc' | 'desc' }>({
    key: 'created_at',
    direction: 'desc',
  });

  const { 
    data: assessments = [], 
    isLoading: isLoadingAssessments, 
    error: assessmentsError,
    refetch: refetchAssessments,
  } = useQuery<SiteAssessment[], Error>({
    queryKey: ['siteAssessments', user?.id],
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return getSiteAssessmentsForUser(user.id);
    },
    enabled: !!user?.id && currentStep === 'idle',
  });
  
  const deleteMutation = useMutation({
    mutationFn: (assessmentId: string) => {
      if (!user?.id) throw new Error("User not authenticated");
      return deleteSiteAssessment(assessmentId, user.id);
    },
    onSuccess: () => {
      toast({ title: "Assessment(s) deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ['siteAssessments', user?.id] });
      setSelectedAssessmentIds([]);
      setShowDeleteDialog(false);
      setAssessmentToDelete(null);
      setAssessmentsToDeleteList([]);
    },
    onError: (error) => {
      toast({
        title: "Error deleting assessment",
        description: error.message,
        variant: "destructive",
      });
      setShowDeleteDialog(false);
    },
  });

  const handleStartNewAssessment = () => {
    setActiveAssessmentId(null);
    setSelectedMetricSetId(null);
    setCurrentStep('newAddress');
  };

  const handleAddressStepCompleted = (assessmentId: string) => {
    setActiveAssessmentId(assessmentId);
    setCurrentStep('selectMetrics');
    refetchAssessments(); 
  };

  const handleMetricSetSelected = (assessmentId: string, metricSetId: string) => {
    setActiveAssessmentId(assessmentId); 
    setSelectedMetricSetId(metricSetId);
    setCurrentStep('inputMetrics');
  };

  const handleMetricValuesSubmitted = (assessmentId: string) => {
    setActiveAssessmentId(assessmentId);
    setCurrentStep('assessmentDetails'); // Go to details view after submitting metrics
    queryClient.invalidateQueries({ queryKey: ['siteAssessments', user?.id] }); 
    queryClient.invalidateQueries({ queryKey: ['siteAssessment', assessmentId] });
    // queryClient.invalidateQueries({ queryKey: ['siteVisitRatings', assessmentId] }); // This might not be needed here
    queryClient.invalidateQueries({ queryKey: ['assessmentMetricValues', assessmentId]}); // For details view
  };

  const handleCancelAssessmentProcess = () => {
    setActiveAssessmentId(null);
    setSelectedMetricSetId(null);
    setCurrentStep('idle');
    refetchAssessments(); 
  };
  
  const handleBackFromMetricSelection = () => {
    // This was previously going to newAddress or idle. 
    // It makes more sense to go back to the main list (idle) if cancelling from metric selection.
    // For consistency, let's use handleCancelAssessmentProcess for full cancellation.
    setCurrentStep('newAddress'); // Go back to editing the address/name of current assessment.
    // If no activeAssessmentId, this would mean cancelling creation, so 'idle'
    // If (activeAssessmentId) setCurrentStep('newAddress'); else setCurrentStep('idle');
    // The SelectTargetMetricSetStep's onBack is currently mapped to handleCancelAssessmentProcess
    // This specific handler is fine as is if it's only for a step back within the flow.
  };

  const handleBackFromMetricInput = () => {
    if (activeAssessmentId) {
      setCurrentStep('selectMetrics');
    } else {
      // This case should ideally not happen if activeAssessmentId is required for inputMetrics step
      setCurrentStep('idle'); 
    }
  };

  const handleViewAssessment = (assessment: SiteAssessment) => {
    if (!assessment.target_metric_set_id) {
      toast({
        title: "Cannot View Details",
        description: "This assessment does not have a Target Metric Set selected. Please edit to select one.",
        variant: "destructive",
      });
      return;
    }
    setActiveAssessmentId(assessment.id);
    setSelectedMetricSetId(assessment.target_metric_set_id);
    setCurrentStep('assessmentDetails');
  };

  const handleEditAssessment = (assessment: SiteAssessment) => {
    setActiveAssessmentId(assessment.id);
    if (assessment.target_metric_set_id) {
      setSelectedMetricSetId(assessment.target_metric_set_id);
      // If metric set exists, user might want to edit metric values or site visit ratings
      // Taking them to 'inputMetrics' covers the metric values part.
      setCurrentStep('inputMetrics'); 
    } else {
      // If no metric set, they must select one first.
      setSelectedMetricSetId(null);
      setCurrentStep('selectMetrics');
    }
  };


  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedAssessmentIds(assessments.map(a => a.id));
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

  const confirmDelete = async () => {
    const idsToDelete = assessmentToDelete ? [assessmentToDelete.id] : assessmentsToDeleteList;
    if (idsToDelete.length === 0) return;
    // The mutation will handle individual processing.
    idsToDelete.forEach(id => deleteMutation.mutate(id));
    // Optimistic update handled by invalidateQueries in onSuccess
  };


  const requestSort = (key: SortableKeys) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedAssessments = useMemo(() => {
    let sortableItems = [...assessments];
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
            const dateA = new Date(valA as string).getTime(); // Cast as string if type is Date | string
            const dateB = new Date(valB as string).getTime();
            return (dateA < dateB ? -1 : dateA > dateB ? 1 : 0) * (sortConfig.direction === 'asc' ? 1 : -1);
        }
        // Fallback for other types if necessary, though current keys are covered.
        return 0;
      });
    }
    return sortableItems;
  }, [assessments, sortConfig]);
  
  const getSortIcon = (columnKey: SortableKeys) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="ml-2 h-4 w-4" /> : 
      <ArrowDown className="ml-2 h-4 w-4" />;
  };
  
  if (currentStep === 'newAddress') {
    return <NewAssessmentForm 
              onAssessmentCreated={handleAddressStepCompleted} 
              onCancel={handleCancelAssessmentProcess}
              // Pass activeAssessmentId if editing existing address details
              existingAssessmentId={activeAssessmentId} 
            />;
  }

  if (currentStep === 'selectMetrics' && activeAssessmentId) {
    return <SelectTargetMetricSetStep 
              assessmentId={activeAssessmentId}
              onMetricSetSelected={handleMetricSetSelected}
              onBack={() => setCurrentStep('newAddress')} // Back to address/name editing
            />;
  }

  if (currentStep === 'inputMetrics' && activeAssessmentId && selectedMetricSetId) {
    return <InputMetricValuesStep
              assessmentId={activeAssessmentId}
              targetMetricSetId={selectedMetricSetId}
              onMetricsSubmitted={handleMetricValuesSubmitted}
              onBack={handleBackFromMetricInput} // Back to metric set selection
            />;
  }
  
  // SiteVisitRatingsStep is not currently in the main flow from here.
  // If it were, it would be:
  // if (currentStep === 'inputSiteVisitRatings' && activeAssessmentId) { ... }


  if (currentStep === 'assessmentDetails' && activeAssessmentId && selectedMetricSetId) {
    return (
      <SiteAssessmentDetailsView
        assessmentId={activeAssessmentId}
        metricSetId={selectedMetricSetId}
        onBack={handleCancelAssessmentProcess} // Back to the main list
      />
    );
  }
  
  // Fallback to idle state (display assessments table)
  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col items-center text-center mb-8">
        <BarChart3 size={48} className="text-primary mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-primary mb-2">Site Prospector</h1>
        <p className="text-lg text-foreground/80 max-w-2xl">
          Evaluate specific sites, track assessments, and compare potential locations using your custom metrics.
        </p>
      </div>

      <div className="flex justify-center mb-8">
        <Button size="lg" onClick={handleStartNewAssessment}>
          <PlusCircle className="mr-2 h-5 w-5" />
          Start New Site Assessment
        </Button>
      </div>
      
      <div className="mt-10 p-6 border border-border rounded-lg bg-card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-card-foreground">My Site Assessments</h2>
          {selectedAssessmentIds.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => openDeleteDialog(selectedAssessmentIds)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && assessmentsToDeleteList.length > 0 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Selected ({selectedAssessmentIds.length})
            </Button>
          )}
        </div>
        {isLoadingAssessments && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
            <p className="text-muted-foreground">Loading assessments...</p>
          </div>
        )}
        {assessmentsError && (
          <p className="text-destructive">Error loading assessments: {assessmentsError.message}</p>
        )}
        {!isLoadingAssessments && !assessmentsError && (
          sortedAssessments && sortedAssessments.length > 0 ? (
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
                           <Badge variant={assessment.site_signal_score >= 75 ? "success" : assessment.site_signal_score >= 50 ? "warning" : "destructive"}>
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
                          onClick={() => handleViewAssessment(assessment)}
                          disabled={!assessment.target_metric_set_id || deleteMutation.isPending}
                          title={!assessment.target_metric_set_id ? "Select a metric set to view details" : "View Details"}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => handleEditAssessment(assessment)}
                          title="Edit Assessment"
                          disabled={deleteMutation.isPending}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-destructive border-destructive hover:bg-destructive/90 hover:text-destructive-foreground"
                          onClick={() => openDeleteDialog(assessment)}
                          title="Delete Assessment"
                          disabled={deleteMutation.isPending && assessmentToDelete?.id === assessment.id}
                        >
                          {deleteMutation.isPending && assessmentToDelete?.id === assessment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground py-10 text-center">
              You haven't started any site assessments yet. Click "Start New Site Assessment" to begin!
            </p>
          )
        )}
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
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SiteProspectorPage;
