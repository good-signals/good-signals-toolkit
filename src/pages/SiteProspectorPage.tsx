
import React, { useState, useEffect } from 'react';
import { Signal, PlusCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import SiteAssessmentsTable from '@/components/site-prospector/SiteAssessmentsTable';
import SiteProspectorStepRenderer from '@/components/site-prospector/SiteProspectorStepRenderer';
import SiteProspectorErrorBoundary from '@/components/site-prospector/SiteProspectorErrorBoundary';
import { useSiteProspectorSession } from '@/hooks/useSiteProspectorSession';
import { useSiteAssessmentOperations } from '@/hooks/useSiteAssessmentOperations';
import { useSiteProspectorStepHandlers } from '@/hooks/useSiteProspectorStepHandlers';
import { useAuth } from '@/contexts/AuthContext';

const SiteProspectorPage = () => {
  const { user, authLoading } = useAuth();
  const {
    currentStep,
    setCurrentStep,
    activeAssessmentId,
    setActiveAssessmentId,
    selectedMetricSetId,
    setSelectedMetricSetId,
    clearSessionStorage,
  } = useSiteProspectorSession();

  const {
    assessments,
    isLoadingAssessments,
    assessmentsError,
    deleteMutation,
  } = useSiteAssessmentOperations(currentStep);

  const [clearSelectionsKey, setClearSelectionsKey] = useState(0);

  const {
    handleStartNewAssessment,
    handleAddressStepCompleted,
    handleMetricSetSelected,
    handleMetricValuesSubmitted,
    handleSiteVisitRatingsSubmitted,
    handleCancelAssessmentProcess,
    handleBackFromMetricSelection,
    handleBackFromMetricInput,
    handleBackFromSiteVisitRatings,
    handleViewAssessment,
    handleEditAssessment,
  } = useSiteProspectorStepHandlers({
    setCurrentStep,
    setActiveAssessmentId,
    setSelectedMetricSetId,
    clearSessionStorage,
    assessments,
  });

  // Clear session storage when user is not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      console.log('User not authenticated, clearing session storage');
      clearSessionStorage();
      setCurrentStep('idle');
    }
  }, [user, authLoading, clearSessionStorage, setCurrentStep]);

  const handleDeleteCommit = (idsToDelete: string[]) => {
    console.log('handleDeleteCommit called with:', idsToDelete);
    
    if (idsToDelete.length === 0 || deleteMutation.isPending) {
      console.log('Aborting delete - no IDs or already pending');
      return;
    }
    
    deleteMutation.mutate(idsToDelete, {
      onSuccess: ({ deletedIds }) => {
        setClearSelectionsKey(prev => prev + 1);
        
        if (activeAssessmentId && deletedIds.includes(activeAssessmentId)) {
          console.log('Active assessment was deleted, returning to idle');
          handleCancelAssessmentProcess();
        }
      }
    });
  };

  console.log('SiteProspectorPage state:', {
    currentStep,
    activeAssessmentId,
    selectedMetricSetId,
    isPending: deleteMutation.isPending,
    assessmentsCount: assessments.length,
    clearSelectionsKey,
    authLoading,
    user: !!user
  });

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <Signal size={48} className="text-primary mx-auto mb-4 animate-pulse" />
            <p className="text-lg">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if user is not authenticated after loading
  if (!user) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <Button variant="ghost" asChild>
              <Link to="/toolkit-hub" className="flex items-center gap-2">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>
        </div>
        
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <Signal size={48} className="text-destructive mx-auto mb-4" />
            <p className="text-lg text-destructive">Authentication Required</p>
            <p className="text-sm text-muted-foreground mb-4">Please sign in to access the Site Prospector</p>
            <Button asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If we're in a step other than idle, render the step component
  if (currentStep !== 'idle') {
    return (
      <SiteProspectorErrorBoundary>
        <SiteProspectorStepRenderer
          currentStep={currentStep}
          activeAssessmentId={activeAssessmentId}
          selectedMetricSetId={selectedMetricSetId}
          onAddressStepCompleted={handleAddressStepCompleted}
          onMetricSetSelected={handleMetricSetSelected}
          onMetricValuesSubmitted={handleMetricValuesSubmitted}
          onSiteVisitRatingsSubmitted={handleSiteVisitRatingsSubmitted}
          onCancelAssessmentProcess={handleCancelAssessmentProcess}
          onBackFromMetricSelection={handleBackFromMetricSelection}
          onBackFromMetricInput={handleBackFromMetricInput}
          onBackFromSiteVisitRatings={handleBackFromSiteVisitRatings}
          setCurrentStep={setCurrentStep}
        />
      </SiteProspectorErrorBoundary>
    );
  }
  
  return (
    <SiteProspectorErrorBoundary>
      <div className="container mx-auto py-10 px-4">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <Button variant="ghost" asChild>
              <Link to="/toolkit-hub" className="flex items-center gap-2">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-col items-center text-center mb-8">
          <Signal size={48} className="text-primary mx-auto mb-4" />
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
        
        <SiteAssessmentsTable
          assessments={assessments}
          isLoading={isLoadingAssessments}
          errorLoading={assessmentsError}
          onViewDetails={handleViewAssessment}
          onEdit={handleEditAssessment}
          onDeleteCommit={handleDeleteCommit}
          isDeleting={deleteMutation.isPending}
          forceClearSelectionsKey={clearSelectionsKey}
        />
      </div>
    </SiteProspectorErrorBoundary>
  );
};

export default SiteProspectorPage;
