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
    mutationFn: (assessmentId: string) => {
      if (!user?.id) throw new Error("User not authenticated");
      return deleteSiteAssessment(assessmentId, user.id);
    },
    onSuccess: (_data, deletedAssessmentId) => { 
      toast({ title: "Assessment deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ['siteAssessments', user?.id] });
      setClearSelectionsKey(prev => prev + 1); 
      
      if (deletedAssessmentId === activeAssessmentId) {
        handleCancelAssessmentProcess(); 
      } else {
         refetchAssessments(); 
      }
    },
    onError: (error) => {
      toast({
        title: "Error deleting assessment",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleDeleteCommit = (idsToDelete: string[]) => {
    if (idsToDelete.length === 0) return;
    idsToDelete.forEach(id => deleteMutation.mutate(id));
  };

  const clearSessionStorageAssessmentState = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.CURRENT_STEP);
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.ACTIVE_ASSESSMENT_ID);
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.SELECTED_METRIC_SET_ID);
  };

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
    setActiveAssessmentId(null);
    setSelectedMetricSetId(null);
    setCurrentStep('idle');
    clearSessionStorageAssessmentState();
    refetchAssessments(); 
  };
  
  const handleBackFromMetricSelection = () => {
    setCurrentStep('newAddress');
  };

  const handleBackFromMetricInput = () => {
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
