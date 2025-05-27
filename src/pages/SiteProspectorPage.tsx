import React, { useState } from 'react';
import { BarChart3, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NewAssessmentForm from '@/components/site-prospector/NewAssessmentForm';
import SelectTargetMetricSetStep from '@/components/site-prospector/SelectTargetMetricSetStep';
import InputMetricValuesStep from '@/components/site-prospector/InputMetricValuesStep';
import SiteAssessmentDetailsView from '@/components/site-prospector/SiteAssessmentDetailsView';

type AssessmentStep = 'idle' | 'newAddress' | 'selectMetrics' | 'inputMetrics' | 'assessmentDetails';

const SiteProspectorPage = () => {
  const [currentStep, setCurrentStep] = useState<AssessmentStep>('idle');
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);
  const [selectedMetricSetId, setSelectedMetricSetId] = useState<string | null>(null);

  const handleStartNewAssessment = () => {
    setActiveAssessmentId(null);
    setSelectedMetricSetId(null);
    setCurrentStep('newAddress');
  };

  const handleAddressStepCompleted = (assessmentId: string) => {
    setActiveAssessmentId(assessmentId);
    setCurrentStep('selectMetrics');
  };

  const handleMetricSetSelected = (assessmentId: string, metricSetId: string) => {
    setActiveAssessmentId(assessmentId); 
    setSelectedMetricSetId(metricSetId);
    setCurrentStep('inputMetrics');
  };

  const handleMetricValuesSubmitted = (assessmentId: string) => {
    setActiveAssessmentId(assessmentId);
    setCurrentStep('assessmentDetails');
    console.log("Assessment ID:", assessmentId, "Metric values submitted. Next step: Assessment Details.");
  };

  const handleCancelAssessmentProcess = () => {
    setActiveAssessmentId(null);
    setSelectedMetricSetId(null);
    setCurrentStep('idle');
  };
  
  const handleBackFromMetricSelection = () => {
    if (activeAssessmentId) {
      setCurrentStep('newAddress'); 
    } else {
      setCurrentStep('idle');
    }
  };

  const handleBackFromMetricInput = () => {
    if (activeAssessmentId && selectedMetricSetId) {
      setCurrentStep('selectMetrics');
    } else if (activeAssessmentId) {
      setCurrentStep('newAddress');
    }
    else {
      setCurrentStep('idle');
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
        metricSetId={selectedMetricSetId}
        onBack={handleCancelAssessmentProcess}
        // onEdit={() => setCurrentStep('inputMetrics')} // Future: allow editing
      />
    );
  }
  
  // Fallback to idle state
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
      
      <div className="mt-10 p-6 border border-dashed border-border rounded-lg bg-card/50">
        <h2 className="text-xl font-semibold text-card-foreground mb-3">My Site Assessments</h2>
        <p className="text-muted-foreground">
          Your saved site assessments will appear here. (Coming soon!)
        </p>
      </div>
    </div>
  );
};

export default SiteProspectorPage;
