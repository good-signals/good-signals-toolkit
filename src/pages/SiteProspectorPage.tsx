
import React, { useState } from 'react';
import { BarChart3, PlusCircle, Eye, Edit, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import NewAssessmentForm from '@/components/site-prospector/NewAssessmentForm';
import SelectTargetMetricSetStep from '@/components/site-prospector/SelectTargetMetricSetStep';
import InputMetricValuesStep from '@/components/site-prospector/InputMetricValuesStep';
import SiteAssessmentDetailsView from '@/components/site-prospector/SiteAssessmentDetailsView';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getSiteAssessmentsForUser } from '@/services/siteAssessmentService';
import { SiteAssessment } from '@/types/siteAssessmentTypes';
import { toast } from "@/components/ui/use-toast";


type AssessmentStep = 'idle' | 'newAddress' | 'selectMetrics' | 'inputMetrics' | 'assessmentDetails';

const SiteProspectorPage = () => {
  const [currentStep, setCurrentStep] = useState<AssessmentStep>('idle');
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);
  const [selectedMetricSetId, setSelectedMetricSetId] = useState<string | null>(null);
  const { user } = useAuth();

  const { 
    data: assessments, 
    isLoading: isLoadingAssessments, 
    error: assessmentsError,
    refetch: refetchAssessments,
  } = useQuery<SiteAssessment[], Error>({
    queryKey: ['siteAssessments', user?.id],
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return getSiteAssessmentsForUser(user.id);
    },
    enabled: !!user?.id && currentStep === 'idle',
  });

  const handleStartNewAssessment = () => {
    setActiveAssessmentId(null);
    setSelectedMetricSetId(null);
    setCurrentStep('newAddress');
  };

  const handleAddressStepCompleted = (assessmentId: string) => {
    setActiveAssessmentId(assessmentId);
    setCurrentStep('selectMetrics');
    refetchAssessments(); // Refetch assessments list in case user cancels and returns to idle
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
    refetchAssessments(); // Refetch to update list with potentially new/updated assessment
  };

  const handleCancelAssessmentProcess = () => {
    setActiveAssessmentId(null);
    setSelectedMetricSetId(null);
    setCurrentStep('idle');
    refetchAssessments(); // Ensure list is up-to-date when returning to idle
  };
  
  const handleBackFromMetricSelection = () => {
    if (activeAssessmentId) {
      // Potentially find the assessment and decide if it was a new one or existing one
      // For now, assume it goes back to address input or idle.
      // If it was a new assessment flow, newAddress. If editing an existing one, could be idle.
      // Let's simplify: if an activeAssessmentId exists, it implies we might be editing or continuing.
      // Going back from metric selection could mean re-entering address if it's a new assessment
      // or returning to the list if it was an edit flow from the list.
      // This needs careful thought for full UX. For now, let's stick to existing logic.
      setCurrentStep('newAddress'); // This was the original logic
    } else {
      setCurrentStep('idle');
    }
     refetchAssessments();
  };

  const handleBackFromMetricInput = () => {
    if (activeAssessmentId && selectedMetricSetId) {
      setCurrentStep('selectMetrics');
    } else if (activeAssessmentId) {
      // This case implies we came from an edit flow that started at selectMetrics (if metricSetId was null)
      setCurrentStep('newAddress'); // Or selectMetrics if appropriate
    }
    else {
      setCurrentStep('idle');
    }
     refetchAssessments();
  };

  const handleViewAssessment = (assessment: SiteAssessment) => {
    if (!assessment.target_metric_set_id) {
      toast({
        title: "Cannot View Details",
        description: "This assessment does not have a Target Metric Set selected. Please edit to select one.",
        variant: "destructive",
      });
      return;
    }
    setActiveAssessmentId(assessment.id);
    setSelectedMetricSetId(assessment.target_metric_set_id);
    setCurrentStep('assessmentDetails');
  };

  const handleEditAssessment = (assessment: SiteAssessment) => {
    setActiveAssessmentId(assessment.id);
    if (assessment.target_metric_set_id) {
      setSelectedMetricSetId(assessment.target_metric_set_id);
      setCurrentStep('inputMetrics');
    } else {
      // If no metric set is associated, start by selecting one
      setSelectedMetricSetId(null);
      setCurrentStep('selectMetrics');
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
              onBack={handleCancelAssessmentProcess} // Changed to unified cancel/back to idle
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
      />
    );
  }
  
  // Fallback to idle state (display assessments table)
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
      
      <div className="mt-10 p-6 border border-border rounded-lg bg-card">
        <h2 className="text-xl font-semibold text-card-foreground mb-4">My Site Assessments</h2>
        {isLoadingAssessments && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
            <p className="text-muted-foreground">Loading assessments...</p>
          </div>
        )}
        {assessmentsError && (
          <p className="text-destructive">Error loading assessments: {assessmentsError.message}</p>
        )}
        {!isLoadingAssessments && !assessmentsError && (
          assessments && assessments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessments.map((assessment) => (
                    <TableRow key={assessment.id}>
                      <TableCell className="font-medium">{assessment.assessment_name || 'N/A'}</TableCell>
                      <TableCell>
                        {assessment.address_line1 || ''}
                        {assessment.address_line1 && assessment.city ? ', ' : ''}
                        {assessment.city || ''}
                      </TableCell>
                      <TableCell>{new Date(assessment.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleViewAssessment(assessment)}
                          disabled={!assessment.target_metric_set_id}
                          title={!assessment.target_metric_set_id ? "Select a metric set to view details" : "View Details"}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEditAssessment(assessment)}
                          title="Edit Assessment"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground py-10 text-center">
              You haven't started any site assessments yet. Click "Start New Site Assessment" to begin!
            </p>
          )
        )}
      </div>
    </div>
  );
};

export default SiteProspectorPage;
