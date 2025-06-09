
import React, { useEffect } from 'react';
import NewAssessmentForm from './NewAssessmentForm';
import SelectTargetMetricSetStep from './SelectTargetMetricSetStep';
import InputMetricValuesStep from './InputMetricValuesStep';
import SiteAssessmentDetailsView from './SiteAssessmentDetailsView';
import SiteProspectorErrorBoundary from './SiteProspectorErrorBoundary';
import { SiteProspectorStep } from '@/hooks/useSiteProspectorSession';
import { useSiteAssessmentDetails } from '@/hooks/useSiteAssessmentDetails';
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
  
  // Fetch assessment details when viewing details
  const { 
    data: assessmentDetails, 
    isLoading: isLoadingDetails, 
    error: detailsError 
  } = useSiteAssessmentDetails(currentStep === 'view-details' ? activeAssessmentId : undefined);
  
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
  
  // Handle automatic redirect on validation error
  useEffect(() => {
    if (validationError) {
      const timer = setTimeout(() => setCurrentStep('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [validationError, setCurrentStep]);
  
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
            {isLoadingDetails && (
              <div className="container mx-auto py-8 px-4 text-center">
                <div className="animate-pulse">Loading assessment details...</div>
              </div>
            )}
            
            {detailsError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Error loading assessment details: {detailsError instanceof Error ? detailsError.message : 'Unknown error'}
                </AlertDescription>
              </Alert>
            )}
            
            {!isLoadingDetails && !detailsError && assessmentDetails && (
              <SiteAssessmentDetailsView
                assessment={assessmentDetails}
                onEditGoToInputMetrics={() => setCurrentStep('metric-input')}
                onBackToList={() => setCurrentStep('idle')}
              />
            )}
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
