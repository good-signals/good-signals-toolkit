import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MapPin, Tag, ListChecks, Edit3, ArrowLeft, Eye, TrendingUp, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getSiteAssessmentById, getAssessmentMetricValues, getSiteVisitRatings } from '@/services/siteAssessmentService';
import { getTargetMetricSetById } from '@/services/targetMetricsService';
import { SiteAssessment, AssessmentMetricValue, AssessmentSiteVisitRatingInsert, siteVisitCriteria } from '@/types/siteAssessmentTypes';
import { TargetMetricSet, UserCustomMetricSetting } from '@/types/targetMetrics';
import { useAuth } from '@/contexts/AuthContext';
import { calculateMetricSignalScore, calculateOverallSiteSignalScore, calculateCompletionPercentage } from '@/lib/signalScoreUtils';

interface SiteAssessmentDetailsViewProps {
  assessmentId: string;
  metricSetId: string;
  onBack: () => void;
}

const SiteAssessmentDetailsView: React.FC<SiteAssessmentDetailsViewProps> = ({
  assessmentId,
  metricSetId,
  onBack,
}) => {
  const { user } = useAuth();

  const { data: assessment, isLoading: isLoadingAssessment, error: assessmentError } = useQuery<SiteAssessment | null, Error>({
    queryKey: ['siteAssessment', assessmentId, user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error('User not authenticated');
      return getSiteAssessmentById(assessmentId, user.id);
    },
    enabled: !!assessmentId && !!user?.id,
  });

  const { data: metricSet, isLoading: isLoadingMetricSet, error: metricSetError } = useQuery<TargetMetricSet | null, Error>({
    queryKey: ['targetMetricSet', metricSetId, user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error('User not authenticated');
      return getTargetMetricSetById(metricSetId, user.id);
    },
    enabled: !!metricSetId && !!user?.id,
  });

  const { data: metricValues, isLoading: isLoadingMetricValues, error: metricValuesError } = useQuery<AssessmentMetricValue[], Error>({
    queryKey: ['assessmentMetricValues', assessmentId],
    queryFn: () => getAssessmentMetricValues(assessmentId),
    enabled: !!assessmentId,
  });

  const { data: siteVisitRatings, isLoading: isLoadingSiteVisitRatings, error: siteVisitRatingsError } = useQuery<AssessmentSiteVisitRatingInsert[], Error>({
    queryKey: ['siteVisitRatings', assessmentId],
    queryFn: () => getSiteVisitRatings(assessmentId),
    enabled: !!assessmentId,
  });

  const metricsWithScores = useMemo(() => {
    if (!metricSet?.user_custom_metrics_settings || !metricValues) return [];
    
    return metricSet.user_custom_metrics_settings.map(setting => {
      const enteredMetricValue = metricValues.find(mv => mv.metric_identifier === setting.metric_identifier);
      const score = calculateMetricSignalScore({
        enteredValue: enteredMetricValue?.entered_value,
        targetValue: setting.target_value,
        higherIsBetter: setting.higher_is_better,
      });
      return {
        ...setting, // Includes label, category, target_value, higher_is_better
        entered_value: enteredMetricValue?.entered_value,
        notes: enteredMetricValue?.notes,
        image_url: enteredMetricValue?.image_url, // if you want to display it
        metric_id_from_assessment: enteredMetricValue?.id, // if needed
        score,
      };
    });
  }, [metricSet, metricValues]);

  const overallSiteSignalScore = useMemo(() => {
    const scores = metricsWithScores.map(m => m.score);
    return calculateOverallSiteSignalScore(scores);
  }, [metricsWithScores]);

  const completionPercentage = useMemo(() => {
    if (!metricSet?.user_custom_metrics_settings) return 0;
    const totalMetricsInSet = metricSet.user_custom_metrics_settings.length;
    const metricsWithEnteredValues = metricsWithScores.filter(m => typeof m.entered_value === 'number').length;
    return calculateCompletionPercentage(totalMetricsInSet, metricsWithEnteredValues);
  }, [metricSet, metricsWithScores]);

  if (isLoadingAssessment || isLoadingMetricSet || isLoadingMetricValues || isLoadingSiteVisitRatings) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading assessment details...</p>
      </div>
    );
  }

  if (assessmentError || metricSetError || metricValuesError || siteVisitRatingsError) {
    return (
      <div className="container mx-auto py-10 px-4 text-center">
        <p className="text-destructive text-xl">
          Error loading assessment details: {assessmentError?.message || metricSetError?.message || metricValuesError?.message || siteVisitRatingsError?.message}
        </p>
        <Button onClick={onBack} variant="outline" className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="container mx-auto py-10 px-4 text-center">
        <p className="text-xl">Assessment not found.</p>
        <Button onClick={onBack} variant="outline" className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  const getFullAddress = (assess: SiteAssessment) => {
    const parts = [
      assess.address_line1,
      assess.address_line2,
      assess.city,
      assess.state_province,
      assess.postal_code,
      assess.country,
    ];
    return parts.filter(Boolean).join(', ');
  };

  const metricsByCategory: Record<string, (UserCustomMetricSetting & { entered_value?: number | null; notes?: string | null; score?: number | null })[]> = {};
  metricsWithScores.forEach(mws => {
    if (!metricsByCategory[mws.category]) {
      metricsByCategory[mws.category] = [];
    }
    metricsByCategory[mws.category].push(mws);
  });

  return (
    <div className="container mx-auto py-10 px-4 space-y-8">
      <div className="flex justify-start mb-6">
        <Button onClick={onBack} variant="outline" size="lg">
          <ArrowLeft className="mr-2 h-5 w-5" /> Back to Prospector Home
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl font-bold text-primary flex items-center">
                <MapPin className="h-7 w-7 mr-3 text-primary" />
                {assessment.assessment_name || 'Site Assessment Details'}
              </CardTitle>
              <CardDescription className="text-md mt-1">
                {getFullAddress(assessment)}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Assessment ID</h3>
              <p className="text-sm">{assessment.id}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Date Created</h3>
              <p className="text-sm">{new Date(assessment.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Target Metric Set</h3>
              <p className="text-sm text-primary font-semibold">{metricSet?.name || 'N/A'}</p>
            </div>
          </div>
          
          {/* Overall Scores Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t mt-6">
            <div>
              <h3 className="text-lg font-semibold text-primary flex items-center mb-2">
                <TrendingUp className="h-5 w-5 mr-2" />
                Overall Site Signal Score
              </h3>
              {overallSiteSignalScore !== null ? (
                <div className="flex items-center">
                  <Progress value={overallSiteSignalScore} className="w-3/4 mr-2 h-3" />
                  <span className="text-xl font-bold">{overallSiteSignalScore}%</span>
                </div>
              ) : (
                <p className="text-muted-foreground">Not enough data to calculate score.</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Stored Score: {assessment.site_signal_score !== null ? `${assessment.site_signal_score}%` : 'N/A (pending calculation)'}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary flex items-center mb-2">
                <CheckCircle className="h-5 w-5 mr-2" />
                Completion Percentage
              </h3>
              <div className="flex items-center">
                <Progress value={completionPercentage} className="w-3/4 mr-2 h-3" />
                <span className="text-xl font-bold">{completionPercentage}%</span>
              </div>
               <p className="text-xs text-muted-foreground mt-1">
                Stored Percentage: {assessment.completion_percentage !== null ? `${assessment.completion_percentage}%` : 'N/A (pending calculation)'}
              </p>
            </div>
          </div>

        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold flex items-center">
            <ListChecks className="h-6 w-6 mr-2 text-primary" />
            Metric Values & Scores
          </CardTitle>
          <CardDescription>
            Detailed breakdown of metric values and their calculated signal scores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(metricsByCategory).length > 0 ? (
            Object.entries(metricsByCategory).map(([category, values]) => (
              <div key={category} className="mb-8 last:mb-0">
                <h3 className="text-xl font-semibold text-primary mb-3 capitalize">{category}</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[25%]">Metric</TableHead>
                        <TableHead className="text-right w-[15%]">Entered Value</TableHead>
                        <TableHead className="text-right w-[15%]">Target Value</TableHead>
                        <TableHead className="text-right w-[15%]">Signal Score</TableHead>
                        <TableHead className="w-[30%]">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {values.map((metric) => (
                        <TableRow key={metric.metric_identifier}>
                          <TableCell className="font-medium">{metric.label}</TableCell>
                          <TableCell className="text-right">
                            {typeof metric.entered_value === 'number' ? metric.entered_value : <span className="text-xs text-muted-foreground">N/A</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            {typeof metric.target_value === 'number' ? metric.target_value : <span className="text-xs text-muted-foreground">N/A</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            {typeof metric.score === 'number' ? (
                              <Badge variant={metric.score >= 75 ? "success" : metric.score >= 50 ? "warning" : "destructive"} className="text-sm">
                                {metric.score}%
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground italic">
                            {metric.notes || 'No notes'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No metric values have been recorded for this assessment yet, or metric set not fully loaded.</p>
          )}
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold flex items-center">
            <Eye className="h-6 w-6 mr-2 text-primary" />
            Site Visit Ratings
          </CardTitle>
          <CardDescription>
            Subjective ratings based on on-site observations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {siteVisitRatings && siteVisitRatings.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[20%]">Criterion</TableHead>
                    <TableHead className="text-center w-[10%]">Grade</TableHead>
                    <TableHead className="w-[40%]">Description</TableHead>
                    <TableHead className="w-[30%]">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {siteVisitCriteria.map((criterion) => {
                    const savedRating = siteVisitRatings.find(r => r.criterion_key === criterion.key);
                    const gradeDetail = savedRating ? criterion.grades.find(g => g.grade === savedRating.rating_grade) : null;
                    
                    return (
                      <TableRow key={criterion.key}>
                        <TableCell className="font-medium">{criterion.label}</TableCell>
                        <TableCell className="text-center">
                          {savedRating ? (
                            <Badge variant="secondary" className="text-sm">{savedRating.rating_grade}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {gradeDetail ? gradeDetail.description : (savedRating ? savedRating.rating_description || 'N/A' : <span className="text-muted-foreground text-xs">Not Rated</span>)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground italic">
                          {savedRating?.notes || (savedRating ? 'No notes' : '')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground">No site visit ratings have been recorded for this assessment yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SiteAssessmentDetailsView;
