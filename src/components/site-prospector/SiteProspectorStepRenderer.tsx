
import React from 'react';
import NewAssessmentForm from './NewAssessmentForm';
import SelectTargetMetricSetStep from './SelectTargetMetricSetStep';
import InputMetricValuesStep from './InputMetricValuesStep';
import SiteAssessmentDetailsView from './SiteAssessmentDetailsView';
import { AssessmentStep } from '@/hooks/useSiteProspectorSession';
import { toast } from "@/components/ui/use-toast";

interface StepRendererProps {
  currentStep: AssessmentStep;
  activeAssessmentId: string | null;
  selectedMetricSetId: string | null;
  onAddressStepCompleted: (assessmentId: string) => void;
  onMetricSetSelected: (assessmentId: string, metricSetId: string) => void;
  onMetricValuesSubmitted: (assessmentId: string) => void;
  onCancelAssessmentProcess: () => void;
  onBackFromMetricSelection: () => void;
  onBackFromMetricInput: () => void;
  setCurrentStep: (step: AssessmentStep) => void;
}

const SiteProspectorStepRenderer: React.FC<StepRendererProps> = ({
  currentStep,
  activeAssessmentId,
  selectedMetricSetId,
  onAddressStepCompleted,
  onMetricSetSelected,
  onMetricValuesSubmitted,
  onCancelAssessmentProcess,
  onBackFromMetricSelection,
  onBackFromMetricInput,
  setCurrentStep,
}) => {
  try {
    if (currentStep === 'newAddress') {
      return (
        <NewAssessmentForm 
          onAssessmentCreated={onAddressStepCompleted} 
          onCancel={onCancelAssessmentProcess}
        />
      );
    }

    if (currentStep === 'selectMetrics' && activeAssessmentId) {
      return (
        <SelectTargetMetricSetStep 
          assessmentId={activeAssessmentId}
          onMetricSetSelected={onMetricSetSelected}
          onBack={onBackFromMetricSelection}
        />
      );
    }

    if (currentStep === 'inputMetrics' && activeAssessmentId && selectedMetricSetId) {
      return (
        <InputMetricValuesStep
          assessmentId={activeAssessmentId}
          targetMetricSetId={selectedMetricSetId}
          onMetricsSubmitted={onMetricValuesSubmitted}
          onBack={onBackFromMetricInput}
        />
      );
    }
    
    if (currentStep === 'assessmentDetails' && activeAssessmentId && selectedMetricSetId) {
      return (
        <SiteAssessmentDetailsView
          assessmentId={activeAssessmentId}
          selectedMetricSetId={selectedMetricSetId}
          onEditGoToInputMetrics={() => {
              setCurrentStep('inputMetrics');
          }}
          onBackToList={onCancelAssessmentProcess}
        />
      );
    }
  } catch (error) {
    console.error('Error rendering step component:', error);
    toast({
      title: "Navigation Error", 
      description: "An error occurred. Returning to the main view.",
      variant: "destructive"
    });
    return null;
  }

  return null;
};

export default SiteProspectorStepRenderer;
