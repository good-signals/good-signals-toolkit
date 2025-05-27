
import React, { useState } from 'react';
import { BarChart3, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NewAssessmentForm from '@/components/site-prospector/NewAssessmentForm';
import SelectTargetMetricSetStep from '@/components/site-prospector/SelectTargetMetricSetStep';
import InputMetricValuesStep from '@/components/site-prospector/InputMetricValuesStep'; // New import
// import SiteAssessmentDetails from '@/components/site-prospector/SiteAssessmentDetails'; // Placeholder

type AssessmentStep = 'idle' | 'newAddress' | 'selectMetrics' | 'inputMetrics' | 'assessmentDetails'; // Added 'inputMetrics'

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
    setCurrentStep('inputMetrics'); // Navigate to new input metrics step
  };

  const handleMetricValuesSubmitted = (assessmentId: string) => {
    setActiveAssessmentId(assessmentId); // Should already be set
    // For now, goes to details. Later maybe a review step.
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
      // Potentially clear selectedMetricSetId if going back to address makes sense
      // For now, just go back to address form
      setCurrentStep('newAddress'); 
    } else {
      setCurrentStep('idle');
    }
  };

  const handleBackFromMetricInput = () => {
    if (activeAssessmentId && selectedMetricSetId) {
      setCurrentStep('selectMetrics'); // Go back to metric set selection
    } else if (activeAssessmentId) {
      setCurrentStep('newAddress'); // Fallback if metric set ID was lost
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
    // Placeholder for showing assessment details/next steps
    return (
      <div className="container mx-auto py-10">
        <h2 className="text-2xl font-bold text-primary mb-4">Assessment Process Completed (ID: {activeAssessmentId})</h2>
        <p>Selected Metric Set: {selectedMetricSetId}</p>
        <p>Metric values have been recorded.</p>
        <p className="mt-4">Next: Displaying a summary of the assessment and potentially site visit ratings will appear here.</p>
        <Button onClick={handleCancelAssessmentProcess} variant="outline" className="mt-6 mr-2">Back to Prospector Home</Button>
        {/* <Button onClick={() => setCurrentStep('inputMetrics')} variant="outline" className="mt-6">Edit Metric Values</Button> */}
      </div>
    );
  }
  
  // Fallback to idle state if currentStep/activeAssessmentId/selectedMetricSetId are not in a valid combination for other views

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
      
      {/* Placeholder for list of existing assessments */}
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
