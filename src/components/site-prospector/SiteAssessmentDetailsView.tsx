import React, { useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, MapPin, Edit3, ArrowLeft, Eye, Map as MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getAssessmentDetails, updateAssessmentScores } from '@/services/siteAssessmentService';
import { fetchUserAccountsWithAdminRole, Account } from '@/services/accountService';
import { getTargetMetricSetById } from '@/services/targetMetricsService'; // Added import
import { TargetMetricSet } from '@/types/targetMetrics';
import { nonEditableMetricIdentifiers } from '@/config/targetMetricsConfig';
import { AssessmentMetricValue, AssessmentSiteVisitRatingInsert, SiteAssessment } from '@/types/siteAssessmentTypes';
import { useAuth } from '@/contexts/AuthContext';
import { calculateMetricSignalScore, calculateOverallSiteSignalScore, calculateCompletionPercentage } from '@/lib/signalScoreUtils';
import { toast } from '@/components/ui/use-toast';
import AddressMapDisplay from './AddressMapDisplay';
import { getMetricLabelForValue, specificDropdownMetrics } from '@/config/metricDisplayConfig';
import { getSignalStatus, SignalStatus } from '@/lib/assessmentDisplayUtils'; // Keep existing import

// Add missing imports
import OverallScoreDisplay from './OverallScoreDisplay';
import MetricCategorySection, { ProcessedMetric } from './MetricCategorySection';
import SiteVisitRatingsSection from './SiteVisitRatingsSection';


interface SiteAssessmentDetailsViewProps {
  assessmentId: string;
  selectedMetricSetId: string; // Changed from targetMetricSet, must be non-null
  onEditGoToInputMetrics: () => void; // Renamed for clarity
  onBackToList: () => void;
}

const SiteAssessmentDetailsView: React.FC<SiteAssessmentDetailsViewProps> = ({
  assessmentId,
  selectedMetricSetId, // Using this prop now
  onEditGoToInputMetrics,
  onBackToList,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: assessment, isLoading: isLoadingAssessment, error: assessmentError } = useQuery<SiteAssessment, Error>({
    queryKey: ['assessmentDetails', assessmentId],
    queryFn: () => getAssessmentDetails(assessmentId),
    enabled: !!assessmentId,
  });

  // Fetch TargetMetricSet internally
  const { data: targetMetricSet, isLoading: isLoadingTargetMetricSet, error: targetMetricSetError } = useQuery<TargetMetricSet | null, Error>({
    queryKey: ['targetMetricSetForDetailsView', selectedMetricSetId, user?.id],
    queryFn: async () => {
      if (!user?.id || !selectedMetricSetId) return null;
      return getTargetMetricSetById(selectedMetricSetId, user.id);
    },
    enabled: !!user?.id && !!selectedMetricSetId,
  });

  const { data: userAccounts, isLoading: isLoadingAccounts } = useQuery<Account[], Error>({
    queryKey: ['userAdminAccounts', user?.id],
    queryFn: () => user ? fetchUserAccountsWithAdminRole(user.id) : Promise.resolve([]),
    enabled: !!user,
  });

  const accountSettings = useMemo(() => {
    if (userAccounts && userAccounts.length > 0) {
      return userAccounts[0];
    }
    return null;
  }, [userAccounts]);

  const updateScoresMutation = useMutation({
    mutationFn: (params: { assessmentId: string; overallSiteSignalScore: number | null; completionPercentage: number | null }) => 
      updateAssessmentScores(params.assessmentId, params.overallSiteSignalScore, params.completionPercentage),
    onSuccess: () => {
      toast({ title: "Scores Updated", description: "The assessment scores have been recalculated and saved." });
      queryClient.invalidateQueries({ queryKey: ['assessmentDetails', assessmentId] });
      queryClient.invalidateQueries({ queryKey: ['siteAssessments', user?.id] }); // Corrected key for list
    },
    onError: (error: Error) => {
      toast({ title: "Score Update Failed", description: `Could not save updated scores: ${error.message}`, variant: "destructive" });
    },
  });

  const metricValues = useMemo(() => assessment?.assessment_metric_values || [], [assessment]);
  const siteVisitRatings = useMemo(() => assessment?.site_visit_ratings || [], [assessment]);

  const { overallSiteSignalScore, completionPercentage, detailedMetricScores } = useMemo(() => {
    if (!targetMetricSet || !metricValues) {
      return { overallSiteSignalScore: null, completionPercentage: 0, detailedMetricScores: new Map() };
    }

    const details = new Map<string, { score: number | null; enteredValue: number | null; targetValue: number | null; higherIsBetter: boolean; notes: string | null; imageUrl: string | null }>();
    (targetMetricSet.user_custom_metrics_settings || []).forEach(setting => {
      const metricValue = metricValues.find(mv => mv.metric_identifier === setting.metric_identifier);
      let score: number | null;

      if (nonEditableMetricIdentifiers.includes(setting.metric_identifier)) {
        score = metricValue?.entered_value ?? null;
      } else {
        score = calculateMetricSignalScore({
          enteredValue: metricValue?.entered_value ?? null,
          targetValue: setting.target_value,
          higherIsBetter: setting.higher_is_better,
        });
      }
      
      details.set(setting.metric_identifier, {
        score: score,
        enteredValue: metricValue?.entered_value ?? null,
        targetValue: setting.target_value,
        higherIsBetter: setting.higher_is_better,
        notes: metricValue?.notes ?? null,
        imageUrl: metricValue?.image_url ?? null,
      });
    });
    
    const numMetricsWithValues = metricValues.filter(mv => mv.entered_value !== null && mv.entered_value !== undefined).length;
    const completion = calculateCompletionPercentage(targetMetricSet.user_custom_metrics_settings?.length || 0, numMetricsWithValues);
    
    const overallScore = calculateOverallSiteSignalScore(Array.from(details.values()).map(d => d.score));

    return { overallSiteSignalScore: overallScore, completionPercentage: completion, detailedMetricScores: details };
  }, [targetMetricSet, metricValues]);

  useEffect(() => {
    if (assessment && targetMetricSet && user) {
      const storedScore = assessment.site_signal_score;
      const storedCompletion = assessment.completion_percentage;

      const isOverallScoreValid = typeof overallSiteSignalScore === 'number';
      const isCompletionValid = typeof completionPercentage === 'number';

      const scoreChanged = isOverallScoreValid && overallSiteSignalScore !== storedScore;
      const completionChanged = isCompletionValid && completionPercentage !== storedCompletion;
      
      const scoreNowNullButWasNumber = overallSiteSignalScore === null && typeof storedScore === 'number';
      const completionNowNullButWasNumber = completionPercentage === null && typeof storedCompletion === 'number';
      
      const scoreNowNumberButWasNull = typeof overallSiteSignalScore === 'number' && storedScore === null;
      const completionNowNumberButWasNull = typeof completionPercentage === 'number' && storedCompletion === null;

      if (scoreChanged || completionChanged || scoreNowNullButWasNumber || completionNowNullButWasNumber || scoreNowNumberButWasNull || completionNowNumberButWasNull) {
        console.log("Recalculated scores differ or initialized, attempting to update DB.", {
          assessmentId,
          newScore: overallSiteSignalScore,
          storedScore,
          newCompletion: completionPercentage,
          storedCompletion,
        });
        updateScoresMutation.mutate({ 
          assessmentId, 
          overallSiteSignalScore: typeof overallSiteSignalScore === 'number' ? overallSiteSignalScore : null, 
          completionPercentage: typeof completionPercentage === 'number' ? completionPercentage : null 
        });
      }
    }
  }, [assessment, targetMetricSet, overallSiteSignalScore, completionPercentage, assessmentId, updateScoresMutation, user]);

  const overallSignalStatus = getSignalStatus(
    overallSiteSignalScore,
    accountSettings?.signal_good_threshold,
    accountSettings?.signal_bad_threshold
  );

  if (isLoadingAssessment || isLoadingAccounts || isLoadingTargetMetricSet) { // Added isLoadingTargetMetricSet
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-4 text-lg">Loading assessment details...</p></div>;
  }

  if (assessmentError) {
    return <Alert variant="destructive" className="max-w-2xl mx-auto my-8">
      <AlertTitle>Error Loading Assessment</AlertTitle>
      <AlertDescription>{assessmentError.message}</AlertDescription>
    </Alert>;
  }

  if (targetMetricSetError) { // Added error handling for targetMetricSet
     return <Alert variant="destructive" className="max-w-2xl mx-auto my-8">
       <AlertTitle>Error Loading Target Metric Set</AlertTitle>
       <AlertDescription>{targetMetricSetError.message}</AlertDescription>
     </Alert>;
  }
  
  if (!assessment || !targetMetricSet) { // Added check for targetMetricSet
     return (
        <div className="flex flex-col items-center justify-center h-screen">
            <Alert variant="default" className="max-w-2xl mx-auto my-8"> {/* Changed "warning" to "default" */}
                <AlertTitle>Incomplete Data</AlertTitle>
                <AlertDescription>Could not load complete assessment details. The target metric set might be missing or invalid.</AlertDescription>
            </Alert>
            <Button variant="outline" onClick={onBackToList} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
            </Button>
        </div>
     );
  }

  const getCategoryMetrics = (category: string): ProcessedMetric[] => {
    return (targetMetricSet?.user_custom_metrics_settings || [])
      .filter(setting => setting.category === category)
      .map(setting => {
        const metricDetail = detailedMetricScores.get(setting.metric_identifier);
        const isNonEditableIdentifier = nonEditableMetricIdentifiers.includes(setting.metric_identifier);

        let enteredDisplayValue: string;
        if (specificDropdownMetrics.includes(setting.metric_identifier) || isNonEditableIdentifier) {
           enteredDisplayValue = getMetricLabelForValue(setting.metric_identifier, metricDetail?.enteredValue ?? null) ?? (metricDetail?.enteredValue?.toString() ?? 'N/A');
        } else {
           enteredDisplayValue = metricDetail?.enteredValue?.toString() ?? 'N/A';
        }
        
        let targetDisplayValue: string;
        if (isNonEditableIdentifier) { 
            targetDisplayValue = "Predefined"; 
        } else if (specificDropdownMetrics.includes(setting.metric_identifier)) {
            targetDisplayValue = getMetricLabelForValue(setting.metric_identifier, metricDetail?.targetValue ?? null) ?? (metricDetail?.targetValue?.toString() ?? 'N/A');
        } else {
            targetDisplayValue = metricDetail?.targetValue?.toString() ?? 'N/A';
        }

        const metricScoreStatus = getSignalStatus(
          metricDetail?.score ?? null,
          accountSettings?.signal_good_threshold,
          accountSettings?.signal_bad_threshold
        );

        return {
          label: setting.label,
          enteredValue: enteredDisplayValue,
          targetValue: targetDisplayValue,
          score: metricDetail?.score,
          metricScoreStatus, // Pass the status object directly
          notes: metricDetail?.notes,
        };
      });
  };
  
  const getCategorySpecificImageIdentifier = (category: string) => `category_${category.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_image_overall`;

  const allCategories = targetMetricSet?.user_custom_metrics_settings 
    ? [...new Set(targetMetricSet.user_custom_metrics_settings.map(m => m.category))] 
    : [];
  
  const siteVisitSectionImage = assessment.assessment_metric_values?.find(mv => mv.metric_identifier === 'site_visit_section_image_overall')?.image_url;

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-3xl font-bold text-primary flex items-center">
              <Eye className="h-8 w-8 mr-3" />
              Assessment: {assessment.assessment_name || 'N/A'}
            </CardTitle>
            <CardDescription className="mt-1">
              Address: {assessment.address_line1 || 'Not specified'}
            </CardDescription>
          </div>
          <div className="flex space-x-3">
             <Button variant="outline" onClick={onBackToList}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
            </Button>
            <Button onClick={onEditGoToInputMetrics}> {/* Uses renamed prop */}
              <Edit3 className="mr-2 h-4 w-4" /> Edit Assessment Data
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <OverallScoreDisplay
            overallSiteSignalScore={overallSiteSignalScore}
            completionPercentage={completionPercentage}
            signalStatus={overallSignalStatus}
            isLoadingAccounts={isLoadingAccounts}
            accountSettings={accountSettings}
          />
        </CardContent>
      </Card>

      {typeof assessment.latitude === 'number' && typeof assessment.longitude === 'number' && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold flex items-center">
              <MapIcon className="h-6 w-6 mr-2 text-primary" />
              Site Location Map
            </CardTitle>
            <CardDescription>
              Visual representation of the assessed site location.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddressMapDisplay latitude={assessment.latitude} longitude={assessment.longitude} />
          </CardContent>
        </Card>
      )}

      {allCategories.map(category => {
        const metricsForCategory = getCategoryMetrics(category);
        const categoryImage = assessment.assessment_metric_values?.find(mv => mv.metric_identifier === getCategorySpecificImageIdentifier(category))?.image_url;
        
        return (
          <MetricCategorySection
            key={category}
            category={category}
            metricsForCategory={metricsForCategory}
            categoryImage={categoryImage}
            accountSettings={accountSettings}
          />
        );
      })}
      
      <SiteVisitRatingsSection
        siteVisitRatings={siteVisitRatings}
        siteVisitSectionImage={siteVisitSectionImage}
      />
    </div>
  );
};

export default SiteAssessmentDetailsView;
