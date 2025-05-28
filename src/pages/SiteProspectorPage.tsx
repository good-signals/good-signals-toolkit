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
      console.log('=== MUTATION STARTED ===');
      console.log('Assessment IDs to delete:', assessmentIds);
      console.log('User ID:', user?.id);
      
      if (!user?.id) {
        console.error('User not authenticated');
        throw new Error("User not authenticated");
      }
      
      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (const assessmentId of assessmentIds) {
        try {
          console.log(`Attempting to delete assessment: ${assessmentId}`);
          await deleteSiteAssessment(assessmentId, user.id);
          console.log(`Successfully deleted assessment: ${assessmentId}`);
          results.push({ id: assessmentId, success: true });
          successCount++;
        } catch (error) {
          console.error(`Failed to delete assessment ${assessmentId}:`, error);
          results.push({ id: assessmentId, success: false, error });
          failureCount++;
        }
      }

      console.log(`Deletion complete - Success: ${successCount}, Failures: ${failureCount}`);

      if (failureCount > 0) {
        const errorMessage = `Failed to delete ${failureCount} out of ${results.length} assessments`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }

      return { successCount, deletedIds: assessmentIds, results };
    },
    onSuccess: ({ successCount, deletedIds }) => { 
      console.log('=== MUTATION SUCCESS ===');
      console.log('Success count:', successCount);
      console.log('Deleted IDs:', deletedIds);
      
      toast({ 
        title: `Successfully deleted ${successCount} assessment${successCount > 1 ? 's' : ''}` 
      });
      
      // Invalidate and refetch the assessments
      queryClient.invalidateQueries({ queryKey: ['siteAssessments', user?.id] });
      setClearSelectionsKey(prev => prev + 1); 
      
      // If the active assessment was deleted, cancel the process
      if (activeAssessmentId && deletedIds.includes(activeAssessmentId)) {
        console.log('Deleted assessment was active, canceling process');
        handleCancelAssessmentProcess(); 
      }
    },
    onError: (error) => {
      console.log('=== MUTATION ERROR ===');
      console.error('Deletion error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error deleting assessments",
        description: errorMessage,
        variant: "destructive",
      });
    },
    onSettled: () => {
      console.log('=== MUTATION SETTLED ===');
      console.log('Mutation is now complete (success or error)');
    }
  });
  
  const handleDeleteCommit = (idsToDelete: string[]) => {
    console.log('=== handleDeleteCommit called ===');
    console.log('IDs to delete:', idsToDelete);
    console.log('Current mutation state - isPending:', deleteMutation.isPending);
    
    if (idsToDelete.length === 0) {
      console.log('No assessments to delete - aborting');
      return;
    }
    
    if (deleteMutation.isPending) {
      console.log('Mutation already pending - aborting to prevent double deletion');
      return;
    }
    
    console.log('Starting deletion mutation...');
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

  // Debug the current deletion state
  console.log('SiteProspectorPage deletion state:', {
    isPending: deleteMutation.isPending,
    isError: deleteMutation.isError,
    error: deleteMutation.error,
    clearSelectionsKey
  });

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
              onBack={handleBackFromMetricSelection}
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
    return (
      <SiteAssessmentDetailsView
        assessmentId={activeAssessmentId}
        selectedMetricSetId={selectedMetricSetId}
        onEditGoToInputMetrics={() => {
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
