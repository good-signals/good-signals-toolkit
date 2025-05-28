import React, { useMemo, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, MapPin, Edit3, ArrowLeft, Eye, Map as MapIcon, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  getAssessmentDetails, 
  updateAssessmentScores,
  generateExecutiveSummaryForAssessment,
  updateSiteAssessmentSummary
} from '@/services/siteAssessmentService';
import { fetchUserAccountsWithAdminRole, Account } from '@/services/accountService';
import { getTargetMetricSetById } from '@/services/targetMetricsService';
import { TargetMetricSet } from '@/types/targetMetrics';
import { nonEditableMetricIdentifiers } from '@/config/targetMetricsConfig';
import { 
  AssessmentMetricValue, 
  AssessmentSiteVisitRatingInsert, 
  SiteAssessment,
  siteVisitCriteria
} from '@/types/siteAssessmentTypes';
import { useAuth } from '@/contexts/AuthContext';
import { calculateMetricSignalScore, calculateOverallSiteSignalScore, calculateCompletionPercentage } from '@/lib/signalScoreUtils';
import { toast } from '@/components/ui/use-toast';
import AddressMapDisplay from './AddressMapDisplay';
import { getMetricLabelForValue, specificDropdownMetrics } from '@/config/metricDisplayConfig';
import { getSignalStatus, SignalStatus } from '@/lib/assessmentDisplayUtils';
import { format } from 'date-fns';

import OverallScoreDisplay from './OverallScoreDisplay';
import MetricCategorySection, { ProcessedMetric } from './MetricCategorySection';
import SiteVisitRatingsSection from './SiteVisitRatingsSection';

interface SiteAssessmentDetailsViewProps {
  assessmentId: string;
  selectedMetricSetId: string;
  onEditGoToInputMetrics: () => void;
  onBackToList: () => void;
}

const SiteAssessmentDetailsView: React.FC<SiteAssessmentDetailsViewProps> = ({
  assessmentId,
  selectedMetricSetId,
  onEditGoToInputMetrics,
  onBackToList,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const { data: assessment, isLoading: isLoadingAssessment, error: assessmentError, refetch: refetchAssessment } = useQuery<SiteAssessment, Error>({
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
      // toast({ title: "Scores Updated", description: "The assessment scores have been recalculated and saved." });
      // No toast needed here, as it's an automatic background update.
      queryClient.invalidateQueries({ queryKey: ['assessmentDetails', assessmentId] });
      queryClient.invalidateQueries({ queryKey: ['siteAssessments', user?.id] });
    },
    onError: (error: Error) => {
      console.error("Score Update Failed", `Could not save updated scores: ${error.message}`);
      // No toast for background update failure to avoid bothering user unless critical
    },
  });

  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      if (!assessment || !targetMetricSet || !user) {
        throw new Error("Missing necessary data to generate summary.");
      }
      setIsGeneratingSummary(true);

      const siteVisitRatingsWithLabels = (assessment.site_visit_ratings || []).map(rating => {
        const criterion = siteVisitCriteria.find(c => c.key === rating.criterion_key);
        const gradeInfo = criterion?.grades.find(g => g.grade === rating.rating_grade);
        return {
          ...rating,
          label: criterion?.label || rating.criterion_key,
          rating_description: gradeInfo?.description || 'N/A',
        };
      });
      
      const metricCategories = targetMetricSet?.user_custom_metrics_settings
        ? [...new Set(targetMetricSet.user_custom_metrics_settings.map(m => m.category))]
        : [];

      const summary = await generateExecutiveSummaryForAssessment(
        assessment,
        detailedMetricScores,
        siteVisitRatingsWithLabels,
        accountSettings,
        targetMetricSet,
        metricCategories
      );
      await updateSiteAssessmentSummary(assessmentId, summary, user.id);
      return summary;
    },
    onSuccess: () => {
      toast({ title: "Executive Summary Generated", description: "The summary has been successfully generated and saved." });
      queryClient.invalidateQueries({ queryKey: ['assessmentDetails', assessmentId] });
       queryClient.invalidateQueries({ queryKey: ['siteAssessments', user?.id] });
    },
    onError: (error: Error) => {
      toast({ title: "Summary Generation Failed", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      setIsGeneratingSummary(false);
    }
  });

  const metricValues = useMemo(() => assessment?.assessment_metric_values || [], [assessment]);
  const siteVisitRatings = useMemo(() => assessment?.site_visit_ratings || [], [assessment]);

  const { overallSiteSignalScore, completionPercentage, detailedMetricScores } = useMemo(() => {
    if (!targetMetricSet || !metricValues) {
      return { overallSiteSignalScore: null, completionPercentage: 0, detailedMetricScores: new Map() };
    }

    const details = new Map<string, { score: number | null; enteredValue: any; targetValue: any; higherIsBetter: boolean; notes: string | null; imageUrl: string | null }>();
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

  if (isLoadingAssessment || isLoadingAccounts || isLoadingTargetMetricSet) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-4 text-lg">Loading assessment details...</p></div>;
  }

  if (assessmentError) {
    return <Alert variant="destructive" className="max-w-2xl mx-auto my-8">
      <AlertTitle>Error Loading Assessment</AlertTitle>
      <AlertDescription>{assessmentError.message}</AlertDescription>
    </Alert>;
  }

  if (targetMetricSetError) {
     return <Alert variant="destructive" className="max-w-2xl mx-auto my-8">
       <AlertTitle>Error Loading Target Metric Set</AlertTitle>
       <AlertDescription>{targetMetricSetError.message}</AlertDescription>
     </Alert>;
  }
  
  if (!assessment || !targetMetricSet) {
     return (
        <div className="flex flex-col items-center justify-center h-screen">
            <Alert variant="default" className="max-w-2xl mx-auto my-8">
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
          metricScoreStatus,
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
          <div className="flex items-center space-x-3">
            <Button 
              onClick={() => generateSummaryMutation.mutate()} 
              disabled={isGeneratingSummary || updateScoresMutation.isPending}
              variant="outline"
            >
              {isGeneratingSummary ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              {assessment.executive_summary ? 'Regenerate Executive Summary' : 'Generate Executive Summary'}
            </Button>
            <Button variant="outline" onClick={onBackToList}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
            </Button>
            <Button onClick={onEditGoToInputMetrics}>
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

      {assessment.executive_summary && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold flex items-center">
              <FileText className="h-6 w-6 mr-2 text-primary" />
              Executive Summary
            </CardTitle>
            {assessment.last_summary_generated_at && (
              <CardDescription>
                Last generated: {format(new Date(assessment.last_summary_generated_at), "PPpp")}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              {assessment.executive_summary}
            </div>
          </CardContent>
        </Card>
      )}
      
      {!assessment.executive_summary && !isGeneratingSummary && !completionPercentage && (
         <Alert variant="default" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Generate Executive Summary</AlertTitle>
            <AlertDescription>
              No metric data has been entered for this assessment yet. 
              Please input metric values before generating an executive summary for more meaningful results.
              You can still generate a summary, but it will be based on limited information.
            </AlertDescription>
          </Alert>
      )}

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
