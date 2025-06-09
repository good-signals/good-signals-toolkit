
import React from 'react';
import NewAssessmentForm from './NewAssessmentForm';
import SelectTargetMetricSetStep from './SelectTargetMetricSetStep';
import InputMetricValuesStep from './InputMetricValuesStep';
import SiteAssessmentDetailsView from './SiteAssessmentDetailsView';
import SiteProspectorErrorBoundary from './SiteProspectorErrorBoundary';
import { SiteProspectorStep } from '@/hooks/useSiteProspectorSession';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface SiteProspectorStepRendererProps {
  currentStep: SiteProspectorStep;
  activeAssessmentId?: string;
  selectedMetricSetId?: string;
  onAddressStepCompleted: (assessmentId: string) => void;
  onMetricSetSelected: (metricSetId: string) => void;
  onMetricValuesSubmitted: () => void;
  onCancelAssessmentProcess: () => void;
  onBackFromMetricSelection: () => void;
  onBackFromMetricInput: () => void;
  setCurrentStep: (step: SiteProspectorStep) => void;
}

const SiteProspectorStepRenderer: React.FC<SiteProspectorStepRendererProps> = ({
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
  
  // Validation helpers
  const validateStepRequirements = (step: SiteProspectorStep): string | null => {
    switch (step) {
      case 'metric-set-selection':
        if (!activeAssessmentId) {
          return 'Assessment ID is required for metric set selection';
        }
        break;
      case 'metric-input':
        if (!activeAssessmentId) {
          return 'Assessment ID is required for metric input';
        }
        if (!selectedMetricSetId) {
          return 'Metric set ID is required for metric input';
        }
        break;
      case 'view-details':
        if (!activeAssessmentId) {
          return 'Assessment ID is required for viewing details';
        }
        break;
    }
    return null;
  };

  const validationError = validateStepRequirements(currentStep);
  
  if (validationError) {
    console.error('[SiteProspectorStepRenderer] Validation error:', validationError);
    
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {validationError}. Returning to start.
          </AlertDescription>
        </Alert>
        {setTimeout(() => setCurrentStep('idle'), 2000)}
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'address':
        return (
          <SiteProspectorErrorBoundary onReset={() => setCurrentStep('idle')}>
            <NewAssessmentForm
              onAssessmentCreated={onAddressStepCompleted}
              onCancel={onCancelAssessmentProcess}
            />
          </SiteProspectorErrorBoundary>
        );

      case 'metric-set-selection':
        return (
          <SiteProspectorErrorBoundary onReset={() => setCurrentStep('address')}>
            <SelectTargetMetricSetStep
              assessmentId={activeAssessmentId!}
              onMetricSetSelected={onMetricSetSelected}
              onBack={onBackFromMetricSelection}
            />
          </SiteProspectorErrorBoundary>
        );

      case 'metric-input':
        return (
          <SiteProspectorErrorBoundary onReset={() => setCurrentStep('metric-set-selection')}>
            <InputMetricValuesStep
              assessmentId={activeAssessmentId!}
              targetMetricSetId={selectedMetricSetId!}
              onMetricsSubmitted={onMetricValuesSubmitted}
              onBack={onBackFromMetricInput}
            />
          </SiteProspectorErrorBoundary>
        );

      case 'view-details':
        return (
          <SiteProspectorErrorBoundary onReset={() => setCurrentStep('idle')}>
            <SiteAssessmentDetailsView
              assessment={{} as any}
              onEditGoToInputMetrics={() => setCurrentStep('metric-input')}
              onBackToList={() => setCurrentStep('idle')}
            />
          </SiteProspectorErrorBoundary>
        );

      default:
        console.warn('[SiteProspectorStepRenderer] Unknown step:', currentStep);
        return null;
    }
  };

  return renderStep();
};

export default SiteProspectorStepRenderer;
