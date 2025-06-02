import React, { useMemo, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, MapPin, Edit3, ArrowLeft, Eye, Map as MapIcon, FileText, AlertCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { nonEditableMetricIdentifiers, sortCategoriesByOrder } from '@/config/targetMetricsConfig';
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
import ExportButton from '../export/ExportButton';
import { ExportData } from '@/services/exportService';

import OverallScoreDisplay from './OverallScoreDisplay';
import MetricCategorySection, { ProcessedMetric } from './MetricCategorySection';
import SiteVisitRatingsSection from './SiteVisitRatingsSection';
import EditableExecutiveSummary from './EditableExecutiveSummary';
import DocumentUpload from './DocumentUpload';
import { getAssessmentDocuments, AssessmentDocument } from '@/services/documentService';

interface SiteAssessmentDetailsViewProps {
  assessmentId: string;
  selectedMetricSetId: string;
  onEditGoToInputMetrics: () => void;
  onBackToList: () => void;
}

const getSiteStatusColor = (status: string | null | undefined): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'Prospect': return 'outline';
    case 'LOI': return 'secondary';
    case 'Lease': return 'default';
    case 'Development': return 'secondary';
    case 'Open': return 'default';
    case 'Closed': return 'destructive';
    default: return 'outline';
  }
};

const SiteAssessmentDetailsView: React.FC<SiteAssessmentDetailsViewProps> = ({
  assessmentId,
  selectedMetricSetId,
  onEditGoToInputMetrics,
  onBackToList,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isCalculatingScores, setIsCalculatingScores] = useState(false);

  console.log('[SiteAssessmentDetailsView] Component rendered with props:', { assessmentId, selectedMetricSetId });

  // Default signal thresholds since they were removed from the database
  const defaultGoodThreshold = 0.75;
  const defaultBadThreshold = 0.50;

  // Enhanced query with better error handling and cache management
  const { data: assessment, isLoading: isLoadingAssessment, error: assessmentError, refetch: refetchAssessment } = useQuery<SiteAssessment, Error>({
    queryKey: ['assessmentDetails', assessmentId],
    queryFn: async () => {
      console.log('[SiteAssessmentDetailsView] Fetching assessment details for ID:', assessmentId);
      if (!assessmentId) {
        throw new Error('Assessment ID is required');
      }
      
      try {
        const result = await getAssessmentDetails(assessmentId);
        console.log('[SiteAssessmentDetailsView] Assessment details fetched successfully:', {
          id: result.id,
          name: result.assessment_name,
          score: result.site_signal_score,
          completion: result.completion_percentage,
          metricValuesCount: result.assessment_metric_values?.length || 0,
          targetMetricSetId: result.target_metric_set_id
        });
        return result;
      } catch (error) {
        console.error('[SiteAssessmentDetailsView] Error fetching assessment details:', error);
        // Clear potentially stale cache entries on error
        queryClient.removeQueries({ queryKey: ['assessmentDetails', assessmentId] });
        queryClient.removeQueries({ queryKey: ['siteAssessments'] });
        throw error;
      }
    },
    enabled: !!assessmentId,
    retry: (failureCount, error) => {
      console.log('[SiteAssessmentDetailsView] Query retry attempt:', failureCount, error?.message);
      // Retry up to 2 times for network errors, but not for 404s or auth errors
      if (failureCount < 2 && error?.message?.includes('Failed to fetch')) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 60 * 1000, // 1 minute - increase to reduce tab switching refetches
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch documents separately with error handling
  const { data: documents, isLoading: isLoadingDocuments, error: documentsError, refetch: refetchDocuments } = useQuery<AssessmentDocument[]>({
    queryKey: ['assessmentDocuments', assessmentId],
    queryFn: async () => {
      console.log('[SiteAssessmentDetailsView] Fetching documents for assessment:', assessmentId);
      if (!assessmentId) {
        return [];
      }
      try {
        const result = await getAssessmentDocuments(assessmentId);
        console.log('[SiteAssessmentDetailsView] Documents fetched:', result);
        return result;
      } catch (error) {
        console.error('[SiteAssessmentDetailsView] Documents fetch error:', error);
        return [];
      }
    },
    enabled: !!assessmentId,
    retry: 2,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch TargetMetricSet with improved error handling and debugging
  const { data: targetMetricSet, isLoading: isLoadingTargetMetricSet, error: targetMetricSetError } = useQuery<TargetMetricSet | null, Error>({
    queryKey: ['targetMetricSetForDetailsView', selectedMetricSetId, user?.id],
    queryFn: async () => {
      if (!user?.id || !selectedMetricSetId) {
        console.log('[SiteAssessmentDetailsView] Missing user ID or metric set ID for fetching target metric set');
        return null;
      }
      try {
        console.log('[SiteAssessmentDetailsView] Fetching target metric set:', selectedMetricSetId, 'for user:', user.id);
        const result = await getTargetMetricSetById(selectedMetricSetId, user.id);
        
        console.log('[SiteAssessmentDetailsView] Target metric set fetch result:', {
          found: !!result,
          name: result?.name,
          settingsCount: result?.user_custom_metrics_settings?.length || 0,
          hasSettings: !!result?.user_custom_metrics_settings,
        });
        
        return result;
      } catch (error) {
        console.error('[SiteAssessmentDetailsView] Target metric set fetch error:', error);
        throw error;
      }
    },
    enabled: !!user?.id && !!selectedMetricSetId,
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  const { data: userAccounts, isLoading: isLoadingAccounts } = useQuery<Account[], Error>({
    queryKey: ['userAdminAccounts', user?.id],
    queryFn: () => user ? fetchUserAccountsWithAdminRole(user.id) : Promise.resolve([]),
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  const accountSettings = useMemo(() => {
    if (userAccounts && userAccounts.length > 0) {
      return userAccounts[0];
    }
    return null;
  }, [userAccounts]);

  // Store the database scores for fallback display
  const storedScores = useMemo(() => {
    if (!assessment) return null;
    return {
      overallScore: assessment.site_signal_score,
      completion: assessment.completion_percentage,
    };
  }, [assessment]);

  // Check if all required data is loaded for score calculation
  const isDataReadyForCalculation = useMemo(() => {
    return !!assessment && !!targetMetricSet && !isLoadingAccounts;
  }, [assessment, targetMetricSet, isLoadingAccounts]);

  // Data integrity diagnostics
  const dataIntegrityIssues = useMemo(() => {
    const issues = [];
    
    if (targetMetricSet && (!targetMetricSet.user_custom_metrics_settings || targetMetricSet.user_custom_metrics_settings.length === 0)) {
      issues.push({
        type: 'no_metric_settings',
        message: 'This metric set has no associated metric definitions. This usually indicates the standard metrics were not properly imported when the set was created.',
        severity: 'high' as const
      });
    }
    
    if (assessment && !assessment.target_metric_set_id) {
      issues.push({
        type: 'no_metric_set',
        message: 'This assessment has no associated target metric set.',
        severity: 'medium' as const
      });
    }
    
    return issues;
  }, [targetMetricSet, assessment]);

  // Fixed mutation with proper return type handling
  const metricsMutation = useMutation({
    mutationFn: async (params: { assessmentId: string; overallSiteSignalScore: number | null; completionPercentage: number | null }) => {
      console.log('[SiteAssessmentDetailsView] Updating scores via mutation:', params);
      const updatedAssessment = await updateAssessmentScores(params.assessmentId, params.overallSiteSignalScore, params.completionPercentage);
      return updatedAssessment;
    },
    onSuccess: (updatedAssessment) => {
      console.log('[SiteAssessmentDetailsView] Scores updated successfully:', {
        id: updatedAssessment.id,
        newScore: updatedAssessment.site_signal_score,
        newCompletion: updatedAssessment.completion_percentage
      });
      
      // Invalidate and update cache with fresh data
      queryClient.setQueryData(['assessmentDetails', assessmentId], updatedAssessment);
      queryClient.invalidateQueries({ queryKey: ['siteAssessments', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['assessmentDetails', assessmentId] });
    },
    onError: (error: Error) => {
      console.error("[SiteAssessmentDetailsView] Score update failed:", error);
      toast({
        title: "Score Update Failed",
        description: `Could not save updated scores: ${error.message}`,
        variant: "destructive"
      });
    },
  });

  // Enhanced mutation with better cache invalidation
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

  // Enhanced score calculation with better validation and logging
  const { overallSiteSignalScore, completionPercentage, detailedMetricScores } = useMemo(() => {
    // Don't calculate if data isn't ready yet
    if (!isDataReadyForCalculation) {
      console.log('[SiteAssessmentDetailsView] Data not ready for score calculation, returning nulls');
      setIsCalculatingScores(true);
      return { overallSiteSignalScore: null, completionPercentage: 0, detailedMetricScores: new Map() };
    }

    setIsCalculatingScores(false);
    console.log('[SiteAssessmentDetailsView] Calculating scores with:', {
      settingsCount: targetMetricSet.user_custom_metrics_settings?.length || 0,
      metricValuesCount: metricValues.length
    });

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

    console.log('[SiteAssessmentDetailsView] Calculated scores:', {
      overallScore,
      completion,
      numMetricsWithValues,
      totalMetrics: targetMetricSet.user_custom_metrics_settings?.length || 0
    });

    return { overallSiteSignalScore: overallScore, completionPercentage: completion, detailedMetricScores: details };
  }, [isDataReadyForCalculation, targetMetricSet, metricValues]);

  // Enhanced useEffect with debouncing and better score comparison
  useEffect(() => {
    if (assessment && targetMetricSet && user && !metricsMutation.isPending && !isCalculatingScores) {
      const storedScore = assessment.site_signal_score;
      const storedCompletion = assessment.completion_percentage;

      console.log('[SiteAssessmentDetailsView] Score comparison check:', {
        assessmentId: assessment.id,
        calculatedScore: overallSiteSignalScore,
        storedScore,
        calculatedCompletion: completionPercentage,
        storedCompletion,
        scoresMatch: overallSiteSignalScore === storedScore,
        completionMatches: completionPercentage === storedCompletion
      });

      // Only update if there's a meaningful difference (avoiding floating point precision issues)
      const scoresDiffer = overallSiteSignalScore !== storedScore;
      const completionDiffers = completionPercentage !== storedCompletion;

      if (scoresDiffer || completionDiffers) {
        console.log("[SiteAssessmentDetailsView] Scores differ from database, updating:", {
          assessmentId,
          scoresDiffer,
          completionDiffers,
          newScore: overallSiteSignalScore,
          newCompletion: completionPercentage
        });
        
        // Debounce the update to prevent rapid fire updates
        const timeoutId = setTimeout(() => {
          metricsMutation.mutate({ 
            assessmentId, 
            overallSiteSignalScore, 
            completionPercentage 
          });
        }, 300);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [assessment, targetMetricSet, overallSiteSignalScore, completionPercentage, assessmentId, metricsMutation, user, isCalculatingScores]);

  const overallSignalStatus = getSignalStatus(
    overallSiteSignalScore,
    defaultGoodThreshold,
    defaultBadThreshold
  );

  const handleDocumentsChange = () => {
    refetchDocuments();
  };

  // Create export data for the export functionality
  const exportData: ExportData | null = useMemo(() => {
    if (!assessment || !targetMetricSet || !user) {
      return null;
    }
    
    return {
      assessment,
      targetMetricSet,
      accountSettings,
      detailedMetricScores,
      overallSiteSignalScore,
      completionPercentage,
    };
  }, [assessment, targetMetricSet, user, accountSettings, detailedMetricScores, overallSiteSignalScore, completionPercentage]);

  console.log('[SiteAssessmentDetailsView] Component state:', { 
    isLoadingAssessment, 
    isLoadingAccounts, 
    isLoadingTargetMetricSet,
    isLoadingDocuments,
    isCalculatingScores,
    assessmentError: assessmentError?.message,
    targetMetricSetError: targetMetricSetError?.message,
    documentsError: documentsError?.message,
    assessment: !!assessment,
    targetMetricSet: !!targetMetricSet,
    documentsCount: documents?.length || 0,
    dataIntegrityIssuesCount: dataIntegrityIssues.length
  });

  if (isLoadingAssessment || isLoadingTargetMetricSet) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-4 text-lg">Loading assessment details...</p></div>;
  }

  if (assessmentError) {
    console.error('[SiteAssessmentDetailsView] Assessment error details:', assessmentError);
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Assessment</AlertTitle>
          <AlertDescription>
            {assessmentError.message}
            {assessmentError.message.includes('Failed to fetch') && (
              <div className="mt-2 text-sm">
                This may be due to a network issue or temporary data inconsistency. Please try refreshing.
              </div>
            )}
          </AlertDescription>
        </Alert>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => {
            console.log('[SiteAssessmentDetailsView] Manual refetch triggered');
            refetchAssessment();
          }}>
            Try Again
          </Button>
          <Button variant="outline" onClick={onBackToList}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
          </Button>
        </div>
      </div>
    );
  }

  if (targetMetricSetError) {
     return (
       <div className="flex flex-col items-center justify-center h-screen space-y-4">
         <Alert variant="destructive" className="max-w-2xl mx-auto">
           <AlertCircle className="h-4 w-4" />
           <AlertTitle>Error Loading Target Metric Set</AlertTitle>
           <AlertDescription>{targetMetricSetError.message}</AlertDescription>
         </Alert>
         <Button variant="outline" onClick={onBackToList}>
           <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
         </Button>
       </div>
     );
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
          defaultGoodThreshold,
          defaultBadThreshold
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

  // Use the sortCategoriesByOrder function to ensure proper ordering
  const allCategories = targetMetricSet?.user_custom_metrics_settings 
    ? sortCategoriesByOrder([...new Set(targetMetricSet.user_custom_metrics_settings.map(m => m.category))]) 
    : [];
  
  const siteVisitSectionImage = assessment.assessment_metric_values?.find(mv => mv.metric_identifier === 'site_visit_section_image_overall')?.image_url;

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Data Integrity Issues Alert */}
      {dataIntegrityIssues.length > 0 && (
        <Alert variant={dataIntegrityIssues.some(i => i.severity === 'high') ? "destructive" : "default"} className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Data Integrity Issues Detected</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              {dataIntegrityIssues.map((issue, index) => (
                <div key={index} className="text-sm">
                  • {issue.message}
                </div>
              ))}
              <div className="text-sm mt-3 p-2 bg-muted rounded">
                <strong>Recommended Action:</strong> Go back to the Site Prospector list and try to re-import standard metrics for this assessment, 
                or contact your administrator to ensure the target metric set has properly configured metrics.
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-3xl font-bold text-primary flex items-center">
              <Eye className="h-8 w-8 mr-3" />
              Assessment: {assessment.assessment_name || 'N/A'}
            </CardTitle>
            <CardDescription className="mt-1 space-y-2">
              <div>Address: {assessment.address_line1 || 'Not specified'}</div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Site Status:</span>
                  <Badge variant={getSiteStatusColor(assessment.site_status)} className="text-sm">
                    {assessment.site_status || 'Prospect'}
                  </Badge>
                </div>
                {targetMetricSet && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Target Metric Set:</span>
                    <Badge variant="outline" className="text-sm">
                      {targetMetricSet.name}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ({targetMetricSet.user_custom_metrics_settings?.length || 0} metrics)
                    </span>
                  </div>
                )}
              </div>
            </CardDescription>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={onBackToList}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
            </Button>
            {exportData && (
              <ExportButton 
                exportData={exportData} 
                disabled={isLoadingAssessment || isLoadingTargetMetricSet} 
              />
            )}
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
            isCalculating={isCalculatingScores}
            storedScores={storedScores}
          />
        </CardContent>
      </Card>

      {assessment.executive_summary ? (
        <EditableExecutiveSummary
          assessmentId={assessmentId}
          executiveSummary={assessment.executive_summary}
          lastSummaryGeneratedAt={assessment.last_summary_generated_at}
          onRegenerateClick={() => generateSummaryMutation.mutate()}
          isRegenerating={isGeneratingSummary || metricsMutation.isPending}
        />
      ) : (
        <>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold flex items-center">
                <FileText className="h-6 w-6 mr-2 text-primary" />
                Executive Summary
              </CardTitle>
              <CardDescription>
                No executive summary has been generated yet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => generateSummaryMutation.mutate()} 
                disabled={isGeneratingSummary || metricsMutation.isPending}
              >
                {isGeneratingSummary ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                Generate Executive Summary
              </Button>
            </CardContent>
          </Card>
          
          {!completionPercentage && (
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
        </>
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

      {/* Render categories in the correct order - only if we have settings */}
      {allCategories.length > 0 ? (
        allCategories.map(category => {
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
        })
      ) : (
        <Alert variant="default" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Metric Categories Available</AlertTitle>
          <AlertDescription>
            This assessment's target metric set has no configured metrics. 
            Please edit the assessment to select a properly configured metric set or import standard metrics.
          </AlertDescription>
        </Alert>
      )}
      
      <SiteVisitRatingsSection
        siteVisitRatings={siteVisitRatings}
        siteVisitSectionImage={siteVisitSectionImage}
      />

      {/* Document Attachments Section */}
      <DocumentUpload
        assessmentId={assessmentId}
        documents={documents || []}
        onDocumentsChange={handleDocumentsChange}
      />

      {documentsError && (
        <Alert variant="default" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Documents Loading Issue</AlertTitle>
          <AlertDescription>
            There was an issue loading the documents for this assessment. The document upload feature may not work properly.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default SiteAssessmentDetailsView;
