
import React, { useState } from 'react';
import { BarChart3, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NewAssessmentForm from '@/components/site-prospector/NewAssessmentForm';
import SelectTargetMetricSetStep from '@/components/site-prospector/SelectTargetMetricSetStep'; // New import
// import SiteAssessmentDetails from '@/components/site-prospector/SiteAssessmentDetails'; // Placeholder

type AssessmentStep = 'idle' | 'newAddress' | 'selectMetrics' | 'assessmentDetails'; // Added 'selectMetrics'

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
    setActiveAssessmentId(assessmentId); // Should already be set
    setSelectedMetricSetId(metricSetId);
    setCurrentStep('assessmentDetails'); // For now, goes to details. Later 'inputMetrics'
    // TODO: Navigate to the next step (Input Metrics)
    console.log("Assessment ID:", assessmentId, "Metric Set ID:", metricSetId, "selected. Next step: Input Metrics.");
  };

  const handleCancelAssessmentProcess = () => {
    setActiveAssessmentId(null);
    setSelectedMetricSetId(null);
    setCurrentStep('idle');
  };
  
  const handleBackFromMetricSelection = () => {
    // If desired, could allow editing address, or just cancel.
    // For simplicity, going back from metric selection might mean restarting or just cancelling.
    // Let's go back to the address form, assuming the assessmentId is still valid for potential updates.
    // If assessment ID exists, it means address was already created.
    if (activeAssessmentId) {
      setCurrentStep('newAddress'); // Could also be 'idle' if we want full restart
    } else {
      setCurrentStep('idle');
    }
  };

  if (currentStep === 'newAddress') {
    return <NewAssessmentForm 
              onAssessmentCreated={handleAddressStepCompleted} 
              onCancel={handleCancelAssessmentProcess} 
              // If editing, assessmentId could be passed here
            />;
  }

  if (currentStep === 'selectMetrics' && activeAssessmentId) {
    return <SelectTargetMetricSetStep 
              assessmentId={activeAssessmentId}
              onMetricSetSelected={handleMetricSetSelected}
              onBack={handleBackFromMetricSelection} // Or handleCancelAssessmentProcess if direct cancel
            />;
  }

  if (currentStep === 'assessmentDetails' && activeAssessmentId && selectedMetricSetId) {
    // Placeholder for showing assessment details/next steps (Input Metrics)
    return (
      <div className="container mx-auto py-10">
        <h2 className="text-2xl font-bold text-primary mb-4">Assessment: {activeAssessmentId}</h2>
        <p>Selected Metric Set: {selectedMetricSetId}</p>
        <p>Next step: Inputting metric values for this assessment will appear here.</p>
        <Button onClick={handleCancelAssessmentProcess} variant="outline" className="mt-4 mr-2">Back to Prospector Home</Button>
        {/* <Button onClick={() => setCurrentStep('selectMetrics')} variant="outline" className="mt-4">Change Metric Set</Button> */}
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

