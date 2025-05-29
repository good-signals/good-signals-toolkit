
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

  const [clearSelectionsKey, setClearSelectionsKey] = useState(0);

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
      Object.values(SESSION_STORAGE_KEYS).forEach(key => sessionStorage.removeItem(key));
    }
  }, [currentStep, activeAssessmentId, selectedMetricSetId]);

  // Enhanced assessments query with better cache management
  const { 
    data: assessments = [], 
    isLoading: isLoadingAssessments, 
    error: assessmentsError,
    refetch: refetchAssessments,
  } = useQuery<SiteAssessment[], Error>({
    queryKey: ['siteAssessments', user?.id],
    queryFn: async () => {
      console.log('Fetching site assessments for user:', user?.id);
      if (!user?.id) return Promise.resolve([]);
      
      try {
        const result = await getSiteAssessmentsForUser(user.id);
        console.log('Fetched assessments:', result.length, 'items');
        return result;
      } catch (error) {
        console.error('Error fetching assessments:', error);
        // Clear potentially stale cache on error
        queryClient.removeQueries({ queryKey: ['siteAssessments'] });
        throw error;
      }
    },
    enabled: !!user?.id && currentStep === 'idle',
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
  
  // Enhanced deletion mutation with better error handling and cache management
  const deleteMutation = useMutation({
    mutationFn: async (assessmentIds: string[]) => {
      console.log('Starting deletion mutation for IDs:', assessmentIds);
      
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      
      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (const assessmentId of assessmentIds) {
        try {
          console.log(`Deleting assessment: ${assessmentId}`);
          await deleteSiteAssessment(assessmentId, user.id);
          console.log(`Successfully deleted: ${assessmentId}`);
          results.push({ id: assessmentId, success: true });
          successCount++;
        } catch (error) {
          console.error(`Failed to delete ${assessmentId}:`, error);
          results.push({ id: assessmentId, success: false, error });
          failureCount++;
        }
      }

      console.log(`Deletion results - Success: ${successCount}, Failures: ${failureCount}`);

      if (failureCount > 0) {
        const errorMessage = `Failed to delete ${failureCount} out of ${results.length} assessments`;
        throw new Error(errorMessage);
      }

      return { successCount, deletedIds: assessmentIds, results };
    },
    onSuccess: ({ successCount, deletedIds }) => { 
      console.log('Deletion mutation successful:', { successCount, deletedIds });
      
      toast({ 
        title: `Successfully deleted ${successCount} assessment${successCount > 1 ? 's' : ''}` 
      });
      
      // Clear all related cache entries to ensure fresh data
      queryClient.removeQueries({ queryKey: ['siteAssessments'] });
      queryClient.removeQueries({ queryKey: ['assessmentDetails'] });
      queryClient.removeQueries({ queryKey: ['assessmentDocuments'] });
      
      // Refetch assessments to ensure UI is up to date
      refetchAssessments();
      setClearSelectionsKey(prev => prev + 1); 
      
      if (activeAssessmentId && deletedIds.includes(activeAssessmentId)) {
        console.log('Active assessment was deleted, returning to idle');
        handleCancelAssessmentProcess(); 
      }
    },
    onError: (error) => {
      console.error('Deletion mutation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error deleting assessments",
        description: errorMessage,
        variant: "destructive",
      });
    },
    onSettled: () => {
      console.log('Deletion mutation settled');
    }
  });
  
  const handleDeleteCommit = (idsToDelete: string[]) => {
    console.log('handleDeleteCommit called with:', idsToDelete);
    
    if (idsToDelete.length === 0 || deleteMutation.isPending) {
      console.log('Aborting delete - no IDs or already pending');
      return;
    }
    
    deleteMutation.mutate(idsToDelete);
  };

  const clearSessionStorageAssessmentState = () => {
    Object.values(SESSION_STORAGE_KEYS).forEach(key => sessionStorage.removeItem(key));
  };

  const handleStartNewAssessment = () => {
    console.log('Starting new assessment');
    setActiveAssessmentId(null);
    setSelectedMetricSetId(null);
    setCurrentStep('newAddress');
  };

  const handleAddressStepCompleted = (assessmentId: string) => {
    console.log('Address step completed for:', assessmentId);
    
    if (!assessmentId) {
      console.error('No assessment ID provided');
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
      // Invalidate cache to ensure fresh data when returning to list
      queryClient.invalidateQueries({ queryKey: ['siteAssessments', user?.id] });
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
    console.log('Metric values submitted for:', assessmentId);
    setActiveAssessmentId(null);
    setSelectedMetricSetId(null); 
    setCurrentStep('idle');
    clearSessionStorageAssessmentState();
    
    // Clear all related cache entries to ensure fresh scores
    queryClient.removeQueries({ queryKey: ['siteAssessments'] });
    queryClient.removeQueries({ queryKey: ['assessmentDetails'] });
    
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
    
    // Ensure fresh data when returning to list
    queryClient.invalidateQueries({ queryKey: ['siteAssessments', user?.id] });
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

  console.log('SiteProspectorPage state:', {
    currentStep,
    activeAssessmentId,
    selectedMetricSetId,
    isPending: deleteMutation.isPending,
    assessmentsCount: assessments.length,
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
