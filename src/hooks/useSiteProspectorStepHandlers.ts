
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { SiteAssessment } from '@/types/siteAssessmentTypes';
import { toast } from "@/components/ui/use-toast";
import { AssessmentStep } from './useSiteProspectorSession';

interface StepHandlersProps {
  setCurrentStep: (step: AssessmentStep) => void;
  setActiveAssessmentId: (id: string | null) => void;
  setSelectedMetricSetId: (id: string | null) => void;
  clearSessionStorage: () => void;
  assessments: SiteAssessment[];
}

export const useSiteProspectorStepHandlers = ({
  setCurrentStep,
  setActiveAssessmentId,
  setSelectedMetricSetId,
  clearSessionStorage,
  assessments,
}: StepHandlersProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
    clearSessionStorage();
    
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
    clearSessionStorage();
    
    queryClient.invalidateQueries({ queryKey: ['siteAssessments', user?.id] });
  };
  
  const handleBackFromMetricSelection = () => {
    console.log('Going back from metric selection');
    setCurrentStep('newAddress');
  };

  const handleBackFromMetricInput = () => {
    console.log('Going back from metric input');
    setCurrentStep('selectMetrics');
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

  return {
    handleStartNewAssessment,
    handleAddressStepCompleted,
    handleMetricSetSelected,
    handleMetricValuesSubmitted,
    handleCancelAssessmentProcess,
    handleBackFromMetricSelection,
    handleBackFromMetricInput,
    handleViewAssessment,
    handleEditAssessment,
  };
};
