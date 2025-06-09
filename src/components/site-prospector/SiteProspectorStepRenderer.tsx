
import React from 'react';
import NewAssessmentForm from './NewAssessmentForm';
import SelectTargetMetricSetStep from './SelectTargetMetricSetStep';
import InputMetricValuesStep from './InputMetricValuesStep';
import SiteAssessmentDetailsView from './SiteAssessmentDetailsView';
import { AssessmentStep } from '@/hooks/useSiteProspectorSession';
import { toast } from "@/components/ui/use-toast";
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

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
          account={null}
        />
      );
    }

    // Handle case where we have invalid state (e.g., missing assessment)
    if (currentStep === 'assessmentDetails' && (!activeAssessmentId || !selectedMetricSetId)) {
      console.error('Invalid state: missing assessment ID or metric set ID for details view');
      return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Assessment Not Found</h3>
            <p className="text-gray-600 mb-4">
              The requested assessment could not be loaded. It may have been deleted or you may not have access to it.
            </p>
            <Button onClick={onCancelAssessmentProcess} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Assessments
            </Button>
          </div>
        </div>
      );
    }
  } catch (error) {
    console.error('Error rendering step component:', error);
    toast({
      title: "Navigation Error", 
      description: "An error occurred. Returning to the main view.",
      variant: "destructive"
    });
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Something went wrong</h3>
          <p className="text-gray-600 mb-4">
            An error occurred while loading this view. Please try again.
          </p>
          <Button onClick={onCancelAssessmentProcess} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Assessments
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default SiteProspectorStepRenderer;
