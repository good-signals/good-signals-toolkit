
import React, { useState } from 'react';
import { BarChart3, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SiteAssessmentsTable from '@/components/site-prospector/SiteAssessmentsTable';
import SiteProspectorStepRenderer from '@/components/site-prospector/SiteProspectorStepRenderer';
import { useSiteProspectorSession } from '@/hooks/useSiteProspectorSession';
import { useSiteAssessmentOperations } from '@/hooks/useSiteAssessmentOperations';
import { useSiteProspectorStepHandlers } from '@/hooks/useSiteProspectorStepHandlers';

const SiteProspectorPage = () => {
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
    handleCancelAssessmentProcess,
    handleBackFromMetricSelection,
    handleBackFromMetricInput,
    handleViewAssessment,
    handleEditAssessment,
  } = useSiteProspectorStepHandlers({
    setCurrentStep,
    setActiveAssessmentId,
    setSelectedMetricSetId,
    clearSessionStorage,
    assessments,
  });

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
    clearSelectionsKey
  });

  // If we're in a step other than idle, render the step component
  if (currentStep !== 'idle') {
    return (
      <SiteProspectorStepRenderer
        currentStep={currentStep}
        activeAssessmentId={activeAssessmentId}
        selectedMetricSetId={selectedMetricSetId}
        onAddressStepCompleted={handleAddressStepCompleted}
        onMetricSetSelected={handleMetricSetSelected}
        onMetricValuesSubmitted={handleMetricValuesSubmitted}
        onCancelAssessmentProcess={handleCancelAssessmentProcess}
        onBackFromMetricSelection={handleBackFromMetricSelection}
        onBackFromMetricInput={handleBackFromMetricInput}
        setCurrentStep={setCurrentStep}
      />
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
  );
};

export default SiteProspectorPage;
