
import React from 'react';
import NewAssessmentForm from './NewAssessmentForm';
import SelectTargetMetricSetStep from './SelectTargetMetricSetStep';
import InputMetricValuesStep from './InputMetricValuesStep';
import SiteAssessmentDetailsView from './SiteAssessmentDetailsView';
import { SiteProspectorStep } from '@/hooks/useSiteProspectorSession';

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
  switch (currentStep) {
    case 'address':
      return (
        <NewAssessmentForm
          onAssessmentCreated={onAddressStepCompleted}
          onCancel={onCancelAssessmentProcess}
        />
      );

    case 'metric-set-selection':
      return (
        <SelectTargetMetricSetStep
          onMetricSetSelected={onMetricSetSelected}
          onBack={onBackFromMetricSelection}
        />
      );

    case 'metric-input':
      return (
        <InputMetricValuesStep
          assessmentId={activeAssessmentId!}
          metricSetId={selectedMetricSetId!}
          onSubmitted={onMetricValuesSubmitted}
          onBack={onBackFromMetricInput}
          onCancel={onCancelAssessmentProcess}
        />
      );

    case 'view-details':
      return (
        <SiteAssessmentDetailsView
          assessment={{} as any} // This will be populated by the parent component
          onEditGoToInputMetrics={() => setCurrentStep('metric-input')}
          onBackToList={() => setCurrentStep('idle')}
        />
      );

    default:
      return null;
  }
};

export default SiteProspectorStepRenderer;
