import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, MapPin, Tag, ListChecks, Edit3, ArrowLeft, Eye, TrendingUp, CheckCircle, Save, Map as MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getAssessmentDetails, updateAssessmentScores } from '@/services/siteAssessmentService';
import { fetchUserAccountsWithAdminRole, Account } from '@/services/accountService'; // Added
import { TargetMetricSet, UserCustomMetricSetting } from '@/types/targetMetrics';
import { nonEditableMetricIdentifiers } from '@/config/targetMetricsConfig';
import { AssessmentMetricValue, AssessmentSiteVisitRatingInsert, SiteAssessment, SiteVisitCriterionKey } from '@/types/siteAssessmentTypes';
import { siteVisitCriteria } from '@/types/siteAssessmentTypes';
import { useAuth } from '@/contexts/AuthContext';
import { calculateMetricSignalScore, calculateOverallSiteSignalScore, calculateCompletionPercentage } from '@/lib/signalScoreUtils';
import { toast } from '@/components/ui/use-toast';
import AddressMapDisplay from './AddressMapDisplay';
import { getMetricLabelForValue, specificDropdownMetrics, metricDropdownOptions } from '@/config/metricDisplayConfig';

interface SiteAssessmentDetailsViewProps {
  assessmentId: string;
  targetMetricSet: TargetMetricSet | null;
  onEdit: (assessmentId: string, targetMetricSetId: string) => void;
  onBackToList: () => void;
}

const DEFAULT_GOOD_THRESHOLD = 0.75; // 75%
const DEFAULT_BAD_THRESHOLD = 0.50;  // 50%

interface SignalStatus {
  text: string;
  color: string;
  iconColor: string;
}

const getSignalStatus = (
  score: number | null,
  accountGoodThreshold?: number | null,
  accountBadThreshold?: number | null
): SignalStatus => {
  if (score === null || score === undefined) {
    return { text: 'N/A', color: 'text-muted-foreground', iconColor: 'text-muted-foreground' };
  }

  // Convert score from percentage (0-100) to decimal (0-1) for comparison with thresholds
  const scoreDecimal = score / 100;

  const goodThreshold = accountGoodThreshold ?? DEFAULT_GOOD_THRESHOLD;
  const badThreshold = accountBadThreshold ?? DEFAULT_BAD_THRESHOLD;

  if (scoreDecimal >= goodThreshold) {
    return { text: 'Good', color: 'text-green-600', iconColor: 'text-green-500' };
  }
  if (scoreDecimal <= badThreshold) {
    return { text: 'Bad', color: 'text-red-600', iconColor: 'text-red-500' };
  }
  return { text: 'Neutral', color: 'text-yellow-600', iconColor: 'text-yellow-500' };
};

const SiteAssessmentDetailsView: React.FC<SiteAssessmentDetailsViewProps> = ({ assessmentId, targetMetricSet, onEdit, onBackToList }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: assessment, isLoading: isLoadingAssessment, error: assessmentError } = useQuery<SiteAssessment, Error>({
    queryKey: ['assessmentDetails', assessmentId],
    queryFn: () => getAssessmentDetails(assessmentId),
    enabled: !!assessmentId,
  });

  const { data: userAccounts, isLoading: isLoadingAccounts } = useQuery<Account[], Error>({
    queryKey: ['userAdminAccounts', user?.id],
    queryFn: () => fetchUserAccountsWithAdminRole(user!.id),
    enabled: !!user,
  });

  const accountSettings = useMemo(() => {
    if (userAccounts && userAccounts.length > 0) {
      return userAccounts[0]; // Assuming first admin account's settings are relevant
    }
    return null;
  }, [userAccounts]);

  const updateScoresMutation = useMutation({
    mutationFn: (params: { assessmentId: string; overallSiteSignalScore: number | null; completionPercentage: number | null }) => 
      updateAssessmentScores(params.assessmentId, params.overallSiteSignalScore, params.completionPercentage),
    onSuccess: () => {
      toast({ title: "Scores Updated", description: "The assessment scores have been recalculated and saved." });
      queryClient.invalidateQueries({ queryKey: ['assessmentDetails', assessmentId] });
      queryClient.invalidateQueries({ queryKey: ['siteAssessmentsList', user?.id] });
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

  React.useEffect(() => {
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

  const signalStatus = getSignalStatus(
    overallSiteSignalScore,
    accountSettings?.signal_good_threshold,
    accountSettings?.signal_bad_threshold
  );

  if (isLoadingAssessment || isLoadingAccounts || !assessment || !targetMetricSet) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-4 text-lg">Loading assessment details...</p></div>;
  }

  if (assessmentError) {
    return <Alert variant="destructive" className="max-w-2xl mx-auto my-8">
      <AlertTitle>Error Loading Assessment</AlertTitle>
      <AlertDescription>{assessmentError.message}</AlertDescription>
    </Alert>;
  }

  const getCategoryMetrics = (category: string) => {
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

        return {
          label: setting.label,
          enteredValue: enteredDisplayValue,
          targetValue: targetDisplayValue,
          score: metricDetail?.score,
          notes: metricDetail?.notes,
          imageUrl: assessment.assessment_metric_values?.find(mv => mv.metric_identifier === getCategorySpecificImageIdentifier(category))?.image_url,
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
            <Button onClick={() => onEdit(assessmentId, assessment.target_metric_set_id || '')}>
              <Edit3 className="mr-2 h-4 w-4" /> Edit Assessment Data
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground/90 mb-2">Overall Site Signal Score</h3>
            <div className="flex items-center space-x-2">
              <TrendingUp className={`h-10 w-10 ${signalStatus.iconColor}`} />
              <p className={`text-4xl font-bold ${signalStatus.color}`}>
                {typeof overallSiteSignalScore === 'number' 
                  ? `${overallSiteSignalScore.toFixed(0)}% - ${signalStatus.text}` 
                  : signalStatus.text}
              </p>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              A measure of overall site suitability based on your targets. 
              ({isLoadingAccounts ? 'Loading thresholds...' : accountSettings ? 'Using custom thresholds.' : 'Using default thresholds.'})
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground/90 mb-2">Assessment Completion</h3>
            <div className="flex items-center space-x-2">
              <CheckCircle className={`h-10 w-10 ${completionPercentage >= 100 ? 'text-green-500' : 'text-yellow-500'}`} />
              <p className={`text-4xl font-bold ${completionPercentage >= 100 ? 'text-green-600' : 'text-yellow-600'}`}>
                {completionPercentage.toFixed(0)}%
              </p>
            </div>
             <Progress value={completionPercentage} className="w-full mt-2 h-3" />
            <p className="text-sm text-muted-foreground mt-1">
              Percentage of metrics with entered values.
            </p>
          </div>
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
        if (metricsForCategory.length === 0) return null;
        const categoryImage = assessment.assessment_metric_values?.find(mv => mv.metric_identifier === getCategorySpecificImageIdentifier(category))?.image_url;

        return (
          <Card key={category} className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold flex items-center">
                <Tag className="h-6 w-6 mr-2 text-primary" />
                {category}
              </CardTitle>
              {categoryImage && (
                <CardDescription>Optional image for this section:</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {categoryImage && (
                <div className="mb-6">
                  <img src={categoryImage} alt={`${category} section image`} className="rounded-md max-h-80 w-auto object-contain border" />
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Metric</TableHead>
                    <TableHead className="text-center">Entered Value</TableHead>
                    <TableHead className="text-center">Target Value</TableHead>
                    <TableHead className="text-center">Signal Score</TableHead>
                    <TableHead className="w-[30%]">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metricsForCategory.map(metric => (
                    <TableRow key={metric.label}>
                      <TableCell className="font-medium">{metric.label}</TableCell>
                      <TableCell className="text-center">{metric.enteredValue}</TableCell>
                      <TableCell className="text-center">{metric.targetValue}</TableCell>
                      <TableCell className="text-center">
                        {typeof metric.score === 'number' 
                          ? <Badge variant={metric.score >= 70 ? 'default' : metric.score >= 40 ? 'secondary' : 'destructive'}>
                              {metric.score.toFixed(0)}%
                            </Badge> 
                          : <Badge variant="outline">N/A</Badge>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{metric.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
      
      {siteVisitRatings && siteVisitRatings.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold flex items-center">
              <ListChecks className="h-6 w-6 mr-2 text-primary" />
              Site Visit Ratings
            </CardTitle>
             {siteVisitSectionImage && (
                <CardDescription>Optional image for this section:</CardDescription>
              )}
          </CardHeader>
          <CardContent>
            {siteVisitSectionImage && (
                <div className="mb-6">
                  <img src={siteVisitSectionImage} alt="Site Visit section image" className="rounded-md max-h-80 w-auto object-contain border" />
                </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Criterion</TableHead>
                  <TableHead className="text-center">Rating</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[30%]">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {siteVisitRatings.map((rating: AssessmentSiteVisitRatingInsert) => {
                  const criterionDef = siteVisitCriteria.find(c => c.key === rating.criterion_key);
                  return (
                    <TableRow key={rating.criterion_key}>
                      <TableCell className="font-medium">{criterionDef?.label || rating.criterion_key}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{rating.rating_grade || 'N/A'}</Badge>
                      </TableCell>
                       <TableCell className="text-sm text-muted-foreground">{rating.rating_description || criterionDef?.grades.find(g => g.grade === rating.rating_grade)?.description || '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{rating.notes || '-'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SiteAssessmentDetailsView;
