
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { SiteAssessment } from '@/types/siteAssessmentTypes';
import { toast } from "@/components/ui/use-toast";
import { SiteProspectorStep } from './useSiteProspectorSession';
import { repairTargetMetricSet, checkIfMetricSetNeedsRepair } from '@/services/targetMetrics/metricSetRepairService';
import { getAccountForUser } from '@/services/targetMetrics/accountHelpers';

interface StepHandlersProps {
  setCurrentStep: (step: SiteProspectorStep) => void;
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
    setCurrentStep('address');
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
      setCurrentStep('metric-set-selection');
      queryClient.invalidateQueries({ queryKey: ['siteAssessments', user?.id] });
      console.log('Successfully moved to metric-set-selection step');
    } catch (error) {
      console.error('Error in handleAddressStepCompleted:', error);
      toast({
        title: "Error",
        description: "Failed to proceed to metric selection. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleMetricSetSelected = async (metricSetId: string) => {
    console.log('[useSiteProspectorStepHandlers] Metric set selected:', { metricSetId });
    
    // Check if the metric set needs repair before proceeding
    if (user?.id) {
      try {
        const needsRepair = await checkIfMetricSetNeedsRepair(metricSetId, user.id);
        console.log('[useSiteProspectorStepHandlers] Metric set needs repair:', needsRepair);
        
        if (needsRepair) {
          console.log('[useSiteProspectorStepHandlers] Attempting to repair metric set');
          toast({
            title: "Repairing Metric Set",
            description: "This metric set needs to be repaired. Importing standard metrics...",
          });
          
          const accountId = await getAccountForUser(user.id);
          if (accountId) {
            await repairTargetMetricSet(metricSetId, user.id, accountId);
            
            // Invalidate queries to refresh the data
            queryClient.invalidateQueries({ queryKey: ['targetMetricSet', metricSetId] });
            queryClient.invalidateQueries({ queryKey: ['targetMetricSetForDetailsView', metricSetId] });
            
            toast({
              title: "Metric Set Repaired",
              description: "Successfully imported standard metrics. You can now proceed with the assessment.",
            });
          }
        }
      } catch (error) {
        console.error('[useSiteProspectorStepHandlers] Error during metric set repair:', error);
        toast({
          title: "Repair Failed",
          description: "Could not repair the metric set. You may need to select a different metric set or contact your administrator.",
          variant: "destructive"
        });
        // Don't block the flow, let them proceed anyway
      }
    }
    
    setSelectedMetricSetId(metricSetId);
    setCurrentStep('metric-input');
  };

  const handleMetricValuesSubmitted = () => {
    console.log('Metric values submitted');
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
    setCurrentStep('address');
  };

  const handleBackFromMetricInput = () => {
    console.log('Going back from metric input');
    setCurrentStep('metric-set-selection');
  };
  
  const handleViewAssessment = async (assessment: SiteAssessment) => {
    console.log('[useSiteProspectorStepHandlers] Viewing assessment:', assessment.id);
    
    if (!assessment.target_metric_set_id) {
      toast({
        title: "Cannot View Details",
        description: "This assessment does not have a Target Metric Set selected. Please edit to select one.",
        variant: "destructive",
      });
      return;
    }

    // Check if the metric set needs repair before viewing
    if (user?.id) {
      try {
        const needsRepair = await checkIfMetricSetNeedsRepair(assessment.target_metric_set_id, user.id);
        console.log('[useSiteProspectorStepHandlers] Assessment metric set needs repair:', needsRepair);
        
        if (needsRepair) {
          console.log('[useSiteProspectorStepHandlers] Attempting to repair metric set before viewing');
          toast({
            title: "Repairing Assessment Data",
            description: "This assessment's metric set needs repair. Importing standard metrics...",
          });
          
          const accountId = await getAccountForUser(user.id);
          if (accountId) {
            await repairTargetMetricSet(assessment.target_metric_set_id, user.id, accountId);
            
            // Invalidate queries to refresh the data
            queryClient.invalidateQueries({ queryKey: ['targetMetricSet', assessment.target_metric_set_id] });
            queryClient.invalidateQueries({ queryKey: ['targetMetricSetForDetailsView', assessment.target_metric_set_id] });
            
            toast({
              title: "Assessment Data Repaired",
              description: "Successfully repaired the assessment data. Loading details...",
            });
          }
        }
      } catch (error) {
        console.error('[useSiteProspectorStepHandlers] Error during assessment repair:', error);
        toast({
          title: "Repair Warning",
          description: "Could not repair the assessment data. Some sections may not display properly.",
          variant: "default"
        });
        // Continue anyway - they can still view what's available
      }
    }
    
    setActiveAssessmentId(assessment.id);
    setSelectedMetricSetId(assessment.target_metric_set_id);
    setCurrentStep('view-details');
  };

  const handleEditAssessment = async (assessment: SiteAssessment) => {
    console.log('[useSiteProspectorStepHandlers] Editing assessment:', assessment.id);
    
    setActiveAssessmentId(assessment.id);
    
    if (assessment.target_metric_set_id) {
      // Check if the metric set needs repair before editing
      if (user?.id) {
        try {
          const needsRepair = await checkIfMetricSetNeedsRepair(assessment.target_metric_set_id, user.id);
          console.log('[useSiteProspectorStepHandlers] Edit: metric set needs repair:', needsRepair);
          
          if (needsRepair) {
            console.log('[useSiteProspectorStepHandlers] Attempting to repair metric set before editing');
            toast({
              title: "Repairing Assessment Data",
              description: "This assessment's metric set needs repair. Importing standard metrics...",
            });
            
            const accountId = await getAccountForUser(user.id);
            if (accountId) {
              await repairTargetMetricSet(assessment.target_metric_set_id, user.id, accountId);
              
              // Invalidate queries to refresh the data
              queryClient.invalidateQueries({ queryKey: ['targetMetricSet', assessment.target_metric_set_id] });
              queryClient.invalidateQueries({ queryKey: ['targetMetricSetForDetailsView', assessment.target_metric_set_id] });
              
              toast({
                title: "Assessment Data Repaired",
                description: "Successfully repaired the assessment data. Loading editor...",
              });
            }
          }
        } catch (error) {
          console.error('[useSiteProspectorStepHandlers] Error during edit repair:', error);
          toast({
            title: "Repair Warning",
            description: "Could not repair the assessment data. Some metric sections may not be available.",
            variant: "default"
          });
          // Continue anyway - they can still edit what's available
        }
      }
      
      setSelectedMetricSetId(assessment.target_metric_set_id);
      setCurrentStep('metric-input'); 
    } else {
      setSelectedMetricSetId(null);
      setCurrentStep('metric-set-selection');
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
