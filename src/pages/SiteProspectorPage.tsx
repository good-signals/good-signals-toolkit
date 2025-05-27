
import React, { useState } from 'react';
import { BarChart3, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NewAssessmentForm from '@/components/site-prospector/NewAssessmentForm';
// import SiteAssessmentDetails from '@/components/site-prospector/SiteAssessmentDetails'; // Placeholder for next steps

const SiteProspectorPage = () => {
  const [showNewAssessmentForm, setShowNewAssessmentForm] = useState(false);
  const [currentAssessmentId, setCurrentAssessmentId] = useState<string | null>(null);

  const handleStartNewAssessment = () => {
    setCurrentAssessmentId(null); // Clear any previous assessment
    setShowNewAssessmentForm(true);
  };

  const handleAssessmentCreated = (assessmentId: string) => {
    setShowNewAssessmentForm(false);
    setCurrentAssessmentId(assessmentId);
    // TODO: Navigate to the next step or show assessment details
    console.log("Assessment created/selected:", assessmentId);
    // For now, we'll just log. Next step would be to show a different component
    // or navigate to a details page like /toolkit/site-prospector/:assessmentId
  };

  const handleCancelNewAssessment = () => {
    setShowNewAssessmentForm(false);
  };
  
  // TODO: Add a list of existing assessments later

  if (showNewAssessmentForm) {
    return <NewAssessmentForm onAssessmentCreated={handleAssessmentCreated} onCancel={handleCancelNewAssessment} />;
  }

  if (currentAssessmentId) {
    // Placeholder for showing assessment details/next steps
    return (
      <div className="container mx-auto py-10">
        <h2 className="text-2xl font-bold text-primary mb-4">Assessment: {currentAssessmentId}</h2>
        <p>Next steps for this assessment will appear here.</p>
        <Button onClick={() => setCurrentAssessmentId(null)} variant="outline" className="mt-4">Back to Prospector Home</Button>
      </div>
    );
  }

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
