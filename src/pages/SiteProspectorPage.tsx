import React, { useState, useEffect } from 'react';
import { BarChart3, PlusCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NewAssessmentForm from '@/components/site-prospector/NewAssessmentForm';
import SelectTargetMetricSetStep from '@/components/site-prospector/SelectTargetMetricSetStep';
import InputMetricValuesStep from '@/components/site-prospector/InputMetricValuesStep';
import SiteAssessmentDetailsView from '@/components/site-prospector/SiteAssessmentDetailsView';
import SiteAssessmentsTable from '@/components/site-prospector/SiteAssessmentsTable';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSiteAssessmentsForUser, deleteSiteAssessment } from '@/services/siteAssessmentService';
import { SiteAssessment } from '@/types/siteAssessmentTypes';
import { toast } from "@/components/ui/use-toast";

// Define the AssessmentStep type
export type AssessmentStep = 'idle' | 'newAddress' | 'selectMetrics' | 'inputMetrics' | 'assessmentDetails';

const SESSION_STORAGE_KEYS = {
  CURRENT_STEP: 'siteProspector_currentStep',
  ACTIVE_ASSESSMENT_ID: 'siteProspector_activeAssessmentId',
  SELECTED_METRIC_SET_ID: 'siteProspector_selectedMetricSetId',
};

const SiteProspectorPage = () => {
  const [currentStep, setCurrentStep] = useState<AssessmentStep>(() => {
    const storedStep = sessionStorage.getItem(SESSION_STORAGE_KEYS.CURRENT_STEP);
    return (storedStep as AssessmentStep) || 'idle';
  });
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(() => {
    return sessionStorage.getItem(SESSION_STORAGE_KEYS.ACTIVE_ASSESSMENT_ID) || null;
  });
  const [selectedMetricSetId, setSelectedMetricSetId] = useState<string | null>(() => {
    return sessionStorage.getItem(SESSION_STORAGE_KEYS.SELECTED_METRIC_SET_ID) || null;
  });
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // State for forcing selection clear in child table
  const [clearSelectionsKey, setClearSelectionsKey] = useState(0);

  // ... useEffect for session storage remains the same ...
  useEffect(() => {
    if (currentStep !== 'idle') {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.CURRENT_STEP, currentStep);
      if (activeAssessmentId) {
        sessionStorage.setItem(SESSION_STORAGE_KEYS.ACTIVE_ASSESSMENT_ID, activeAssessmentId);
      } else {
        sessionStorage.removeItem(SESSION_STORAGE_KEYS.ACTIVE_ASSESSMENT_ID);
      }
      if (selectedMetricSetId) {
        sessionStorage.setItem(SESSION_STORAGE_KEYS.SELECTED_METRIC_SET_ID, selectedMetricSetId);
      } else {
        sessionStorage.removeItem(SESSION_STORAGE_KEYS.SELECTED_METRIC_SET_ID);
      }
    } else {
      // Clear all when back to idle
      Object.values(SESSION_STORAGE_KEYS).forEach(key => sessionStorage.removeItem(key));
    }
  }, [currentStep, activeAssessmentId, selectedMetricSetId]);

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
    mutationFn: async (assessmentIds: string[]) => {
      console.log('Attempting to delete assessments:', assessmentIds);
      if (!user?.id) throw new Error("User not authenticated");
      
      const deletionPromises = assessmentIds.map(async (assessmentId) => {
        console.log('Deleting assessment:', assessmentId);
        const assessment = assessments.find(a => a.id === assessmentId);
        console.log('Assessment to delete:', assessment);
        
        try {
          await deleteSiteAssessment(assessmentId, user.id);
          console.log('Assessment deleted successfully:', assessmentId);
          return { id: assessmentId, success: true };
        } catch (error) {
          console.error('Error deleting assessment:', assessmentId, error);
          return { id: assessmentId, success: false, error };
        }
      });

      const results = await Promise.allSettled(deletionPromises);
      const successCount = results.filter(result => 
        result.status === 'fulfilled' && result.value.success
      ).length;
      const failureCount = results.length - successCount;

      if (failureCount > 0) {
        console.error(`${failureCount} deletions failed out of ${results.length}`);
        throw new Error(`Failed to delete ${failureCount} out of ${results.length} assessments`);
      }

      return { successCount, deletedIds: assessmentIds };
    },
    onSuccess: ({ successCount, deletedIds }) => { 
      console.log('Bulk delete mutation success:', { successCount, deletedIds });
      toast({ 
        title: `Successfully deleted ${successCount} assessment${successCount > 1 ? 's' : ''}` 
      });
      queryClient.invalidateQueries({ queryKey: ['siteAssessments', user?.id] });
      setClearSelectionsKey(prev => prev + 1); 
      
      // If the active assessment was deleted, cancel the process
      if (activeAssessmentId && deletedIds.includes(activeAssessmentId)) {
        console.log('Deleted assessment was active, canceling process');
        handleCancelAssessmentProcess(); 
      } else {
        console.log('Refetching assessments after deletion');
        refetchAssessments(); 
      }
    },
    onError: (error) => {
      console.error('Bulk delete mutation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error deleting assessments",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
  
  const handleDeleteCommit = (idsToDelete: string[]) => {
    console.log('handleDeleteCommit called with:', idsToDelete);
    if (idsToDelete.length === 0) {
      console.log('No assessments to delete');
      return;
    }
    
    // Delete all assessments in a single mutation
    deleteMutation.mutate(idsToDelete);
  };

  const clearSessionStorageAssessmentState = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.CURRENT_STEP);
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.ACTIVE_ASSESSMENT_ID);
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.SELECTED_METRIC_SET_ID);
  };

  const handleStartNewAssessment = () => {
    console.log('Starting new assessment');
    setActiveAssessmentId(null);
    setSelectedMetricSetId(null);
    setCurrentStep('newAddress');
  };

  const handleAddressStepCompleted = (assessmentId: string) => {
    console.log('Address step completed for assessment:', assessmentId);
    
    if (!assessmentId) {
      console.error('No assessment ID provided to handleAddressStepCompleted');
      toast({
        title: "Error",
        description: "Failed to proceed to next step. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setActiveAssessmentId(assessmentId);
      setCurrentStep('selectMetrics');
      refetchAssessments();
      console.log('Successfully moved to selectMetrics step');
    } catch (error) {
      console.error('Error in handleAddressStepCompleted:', error);
      toast({
        title: "Error",
        description: "Failed to proceed to metric selection. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleMetricSetSelected = (assessmentId: string, metricSetId: string) => {
    console.log('Metric set selected:', { assessmentId, metricSetId });
    setActiveAssessmentId(assessmentId); 
    setSelectedMetricSetId(metricSetId);
    setCurrentStep('inputMetrics');
  };

  const handleMetricValuesSubmitted = (assessmentId: string) => {
    console.log('Metric values submitted for assessment:', assessmentId);
    setActiveAssessmentId(null);
    setSelectedMetricSetId(null); 
    setCurrentStep('idle');
    clearSessionStorageAssessmentState();
    queryClient.invalidateQueries({ queryKey: ['siteAssessments', user?.id] }); 
    toast({
      title: "Assessment Updated",
      description: "Your site assessment has been successfully updated.",
    });
  };

  const handleCancelAssessmentProcess = () => {
    console.log('Canceling assessment process');
    setActiveAssessmentId(null);
    setSelectedMetricSetId(null);
    setCurrentStep('idle');
    clearSessionStorageAssessmentState();
    refetchAssessments(); 
  };
  
  const handleBackFromMetricSelection = () => {
    console.log('Going back from metric selection');
    setCurrentStep('newAddress');
  };

  const handleBackFromMetricInput = () => {
    console.log('Going back from metric input');
    if (activeAssessmentId) {
      const assessmentBeingEdited = assessments.find(a => a.id === activeAssessmentId);
      if (assessmentBeingEdited?.target_metric_set_id) {
         setCurrentStep('selectMetrics');
      } else {
         setCurrentStep('selectMetrics');
      }
    } else {
      setCurrentStep('idle'); 
      clearSessionStorageAssessmentState();
    }
  };
  
  const handleViewAssessment = (assessment: SiteAssessment) => {
    console.log('Viewing assessment:', assessment.id);
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
    console.log('Editing assessment:', assessment.id);
    setActiveAssessmentId(assessment.id);
    if (assessment.target_metric_set_id) {
      setSelectedMetricSetId(assessment.target_metric_set_id);
      setCurrentStep('inputMetrics'); 
    } else {
      setSelectedMetricSetId(null);
      setCurrentStep('selectMetrics');
    }
  };

  if (currentStep === 'newAddress') {
    return <NewAssessmentForm 
              onAssessmentCreated={handleAddressStepCompleted} 
              onCancel={handleCancelAssessmentProcess}
            />;
  }

  if (currentStep === 'selectMetrics' && activeAssessmentId) {
    return <SelectTargetMetricSetStep 
              assessmentId={activeAssessmentId}
              onMetricSetSelected={handleMetricSetSelected}
              onBack={handleBackFromMetricSelection} // Use specific handler
            />;
  }

  if (currentStep === 'inputMetrics' && activeAssessmentId && selectedMetricSetId) {
    return <InputMetricValuesStep
              assessmentId={activeAssessmentId}
              targetMetricSetId={selectedMetricSetId}
              onMetricsSubmitted={handleMetricValuesSubmitted}
              onBack={handleBackFromMetricInput}
            />;
  }
  
  if (currentStep === 'assessmentDetails' && activeAssessmentId && selectedMetricSetId) {
    // Loading state is now handled within SiteAssessmentDetailsView
    // The check for activeAssessmentId and selectedMetricSetId ensures they are present
    return (
      <SiteAssessmentDetailsView
        assessmentId={activeAssessmentId}
        selectedMetricSetId={selectedMetricSetId} // Pass selectedMetricSetId
        onEditGoToInputMetrics={() => { // Pass callback to go to inputMetrics
            // activeAssessmentId and selectedMetricSetId are in scope
            setCurrentStep('inputMetrics');
        }}
        onBackToList={handleCancelAssessmentProcess}
      />
    );
  }
  
  // Default view: List of assessments (idle state)
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
      
      <SiteAssessmentsTable
        assessmentsData={assessments}
        isLoading={isLoadingAssessments}
        errorLoading={assessmentsError}
        onViewDetails={handleViewAssessment}
        onEdit={handleEditAssessment}
        onDeleteCommit={handleDeleteCommit}
        isDeleting={deleteMutation.isPending}
        forceClearSelectionsKey={clearSelectionsKey}
      />
    </div>
  );
};

export default SiteProspectorPage;
