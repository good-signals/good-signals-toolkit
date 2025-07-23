
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, FileText, MapPin, Calendar, CheckCircle, BarChart2, TrendingUp, RefreshCcw, Download } from 'lucide-react';
import { SiteAssessment } from '@/types/siteAssessmentTypes';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import SiteStatusSelector from './SiteStatusSelector';
import { updateSiteStatus } from '@/services/siteAssessment/statusUpdates';
import { toast } from 'sonner';
import AddressMapDisplay from './AddressMapDisplay';
import EditableExecutiveSummary from './EditableExecutiveSummary';
import MetricDisplaySection from './display/MetricDisplaySection';
import SiteVisitRatingsSection from './SiteVisitRatingsSection';
import { sortCategoriesByOrder } from '@/config/targetMetricsConfig';
import { useSiteAssessmentDetails } from '@/hooks/useSiteAssessmentDetails';
import { getUserCustomMetricSettings } from '@/services/targetMetricsService';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAccount } from '@/services/userAccountService';
import ExportButton from '@/components/export/ExportButton';
import { ExportData } from '@/services/exportService';
import { recalculateAssessmentScoresForMetricSet } from '@/services/assessmentRecalculationService';
import { useQueryClient } from '@tanstack/react-query';

interface SiteAssessmentDetailsProps {
  assessment: SiteAssessment;
  onEditGoToInputMetrics: () => void;
  onBackToList: () => void;
}

const SiteAssessmentDetailsView: React.FC<SiteAssessmentDetailsProps> = ({
  assessment,
  onEditGoToInputMetrics,
  onBackToList,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentStatus, setCurrentStatus] = useState(assessment.site_status || 'Prospect');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [targetMetricsMap, setTargetMetricsMap] = useState<Record<string, {
    target_value: number;
    higher_is_better: boolean;
    measurement_type?: string;
  }>>({});
  const [isLoadingTargetMetrics, setIsLoadingTargetMetrics] = useState(true);
  const [targetMetricSet, setTargetMetricSet] = useState<any>(null);

  // Fetch target metrics when component mounts
  React.useEffect(() => {
    const loadTargetMetrics = async () => {
      if (!assessment.target_metric_set_id || !user?.id) {
        console.log('[DEBUG] Skipping target metrics load:', {
          hasTargetMetricSetId: !!assessment.target_metric_set_id,
          hasUserId: !!user?.id,
          targetMetricSetId: assessment.target_metric_set_id,
          userId: user?.id
        });
        setIsLoadingTargetMetrics(false);
        return;
      }

      try {
        console.log('[DEBUG] Starting target metrics load for set:', assessment.target_metric_set_id);
        const targetSettings = await getUserCustomMetricSettings(assessment.target_metric_set_id);
        
        console.log('[DEBUG] Raw target settings fetched:', {
          settingsCount: targetSettings.length,
          settings: targetSettings
        });
        
        // Create a lookup map for target values
        const metricsMap: Record<string, {
          target_value: number;
          higher_is_better: boolean;
          measurement_type?: string;
        }> = {};
        
        targetSettings.forEach(setting => {
          metricsMap[setting.metric_identifier] = {
            target_value: setting.target_value,
            higher_is_better: setting.higher_is_better,
            measurement_type: setting.measurement_type || undefined,
          };
          console.log('[DEBUG] Added to metrics map:', {
            identifier: setting.metric_identifier,
            targetValue: setting.target_value,
            higherIsBetter: setting.higher_is_better,
            measurementType: setting.measurement_type
          });
        });
        
        console.log('[DEBUG] Final target metrics map:', metricsMap);
        console.log('[DEBUG] Map keys:', Object.keys(metricsMap));
        setTargetMetricsMap(metricsMap);
        
        // Set target metric set for export
        setTargetMetricSet({
          id: assessment.target_metric_set_id,
          user_custom_metrics_settings: targetSettings
        });
      } catch (error) {
        console.error('[DEBUG] Error loading target metrics:', error);
      } finally {
        setIsLoadingTargetMetrics(false);
      }
    };

    loadTargetMetrics();
  }, [assessment.target_metric_set_id, user?.id]);

  // Auto-calculate scores if they're missing and we have metric values
  React.useEffect(() => {
    const shouldAutoCalculateScores = () => {
      // Only auto-calculate if we have metric values but no scores
      const hasMetricValues = assessment.assessment_metric_values && assessment.assessment_metric_values.length > 0;
      const hasNoScores = assessment.site_signal_score === null || assessment.completion_percentage === null;
      return hasMetricValues && hasNoScores && assessment.target_metric_set_id && user?.id;
    };

    if (shouldAutoCalculateScores()) {
      console.log('Auto-calculating scores for assessment with missing scores');
      handleRecalculateScores();
    }
  }, [assessment.site_signal_score, assessment.completion_percentage, assessment.assessment_metric_values, assessment.target_metric_set_id, user?.id]);

  const handleEdit = () => {
    onEditGoToInputMetrics();
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      await updateSiteStatus(assessment.id, newStatus);
      setCurrentStatus(newStatus);
      toast.success('Site status updated successfully');
    } catch (error) {
      console.error('Error updating site status:', error);
      toast.error('Failed to update site status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleRecalculateScores = async () => {
    if (!assessment.target_metric_set_id || !user?.id) {
      toast.error('Unable to recalculate scores - missing data');
      return;
    }

    setIsRecalculating(true);
    try {
      console.log('Recalculating scores for assessment:', assessment.id);
      const result = await recalculateAssessmentScoresForMetricSet(assessment.target_metric_set_id, user.id);
      
      if (result.errors.length > 0) {
        console.error('Recalculation errors:', result.errors);
        toast.error(`Recalculation completed with ${result.errors.length} errors`);
      } else {
        toast.success(`Successfully recalculated scores for ${result.updated} assessment(s)`);
      }

      // Refresh the assessment data
      queryClient.invalidateQueries({ queryKey: ['assessment-details', assessment.id] });
      queryClient.invalidateQueries({ queryKey: ['siteAssessments'] });
    } catch (error) {
      console.error('Error recalculating scores:', error);
      toast.error('Failed to recalculate scores');
    } finally {
      setIsRecalculating(false);
    }
  };

  // Organize metric values by category if they exist, but exclude SiteVisitSectionImages
  const metricsByCategory: Record<string, typeof assessment.assessment_metric_values> = {};
  let siteVisitSectionImage: string | null = null;
  
  console.log('[DEBUG] Assessment metric values:', {
    count: assessment.assessment_metric_values?.length || 0,
    values: assessment.assessment_metric_values
  });
  
  if (assessment.assessment_metric_values && assessment.assessment_metric_values.length > 0) {
    assessment.assessment_metric_values.forEach((metric) => {
      console.log('[DEBUG] Processing metric:', {
        identifier: metric.metric_identifier,
        label: metric.label,
        category: metric.category,
        enteredValue: metric.entered_value
      });

      // Extract the Site Visit section image but don't display it as a metric category
      if (metric.category === 'SiteVisitSectionImages') {
        if (metric.image_url) {
          siteVisitSectionImage = metric.image_url;
        }
        return; // Skip adding to metricsByCategory
      }
      
      if (!metricsByCategory[metric.category]) {
        metricsByCategory[metric.category] = [];
      }
      metricsByCategory[metric.category].push(metric);
    });
  }

  console.log('[DEBUG] Metrics organized by category:', {
    categoryCount: Object.keys(metricsByCategory).length,
    categories: Object.keys(metricsByCategory),
    metricsByCategory
  });

  // Sort categories according to the predefined order
  const sortedCategories = sortCategoriesByOrder(Object.keys(metricsByCategory));

  console.log('[DEBUG] Sorted categories:', sortedCategories);

  // Prepare export data
  const prepareExportData = (): ExportData => {
    // Create detailed metric scores map
    const detailedMetricScores = new Map();
    
    if (assessment.assessment_metric_values) {
      assessment.assessment_metric_values.forEach(metric => {
        if (metric.category !== 'SiteVisitSectionImages') {
          const targetData = targetMetricsMap[metric.metric_identifier];
          detailedMetricScores.set(metric.metric_identifier, {
            category: metric.category,
            label: metric.label,
            enteredValue: metric.entered_value,
            targetValue: targetData?.target_value,
            higherIsBetter: targetData?.higher_is_better,
            measurementType: targetData?.measurement_type,
            notes: metric.notes,
            imageUrl: metric.image_url,
            score: null // You may want to calculate this based on your scoring logic
          });
        }
      });
    }

    return {
      assessment: {
        ...assessment,
        site_visit_ratings: assessment.site_visit_ratings || [],
        siteVisitSectionImage
      },
      targetMetricSet,
      accountSettings: null, // You may want to fetch this if needed
      detailedMetricScores,
      overallSiteSignalScore: assessment.site_signal_score,
      completionPercentage: assessment.completion_percentage
    };
  };

  const getSignalScoreColor = () => {
    const score = assessment.site_signal_score;
    if (score === null || score === undefined) return "text-muted-foreground";
    if (score >= 75) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getSignalScoreLabel = () => {
    const score = assessment.site_signal_score;
    if (score === null || score === undefined) return "Not calculated";
    if (score >= 75) return "Good";
    if (score >= 50) return "Fair";
    return "Poor";
  };

  const formatPercentage = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "N/A";
    return `${Math.round(value)}%`;
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-5xl">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <Button variant="ghost" onClick={onBackToList}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to List
              </Button>
            </div>
            
            <h1 className="text-3xl font-bold text-foreground mb-2">Assessment: {assessment.assessment_name}</h1>
            
            <div className="flex items-center text-muted-foreground mb-3">
              <span className="font-medium">Address:</span>
              <span className="ml-2">{assessment.address_line1}</span>
            </div>
            
            <div className="w-full flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">Site Status:</span>
                <Badge variant={getSiteStatusColor(currentStatus)} className="text-sm">
                  {currentStatus}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">Target Metric Set:</span>
                <span className="text-foreground">Test Targets 1</span>
                <span className="text-muted-foreground">(20 metrics)</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleRecalculateScores}
              disabled={isRecalculating}
            >
              <RefreshCcw className={`mr-2 h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
              {isRecalculating ? 'Recalculating...' : 'Recalculate Scores'}
            </Button>
            <ExportButton exportData={prepareExportData()} />
            <Button onClick={handleEdit} className="bg-foreground text-background hover:bg-foreground/90">
              <Edit className="mr-2 h-4 w-4" />
              Edit Assessment Data
            </Button>
          </div>
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Overall Site Signal Score */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">Overall Site Signal Score</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <TrendingUp className={`h-8 w-8 mr-3 ${getSignalScoreColor()}`} />
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-bold ${getSignalScoreColor()}`}>
                      {assessment.site_signal_score !== null && assessment.site_signal_score !== undefined 
                        ? formatPercentage(assessment.site_signal_score)
                        : "N/A"}
                    </span>
                    <span className={`text-4xl font-bold ${getSignalScoreColor()}`}>
                      - {getSignalScoreLabel()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    A measure of overall site suitability based on your targets. (Using custom thresholds.)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Assessment Completion */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">Assessment Completion</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 mr-3 text-green-600" />
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-green-600">
                      {assessment.completion_percentage !== null && assessment.completion_percentage !== undefined 
                        ? `${Math.round(assessment.completion_percentage)}%`
                        : "0%"}
                    </span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2 mt-2 mb-1">
                    <div 
                      className="bg-foreground h-2 rounded-full transition-all duration-300" 
                      style={{ 
                        width: `${assessment.completion_percentage !== null && assessment.completion_percentage !== undefined 
                          ? Math.round(assessment.completion_percentage) 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Percentage of metrics with entered values.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Executive Summary Section */}
      {assessment.executive_summary && (
        <div className="mb-8">
          <EditableExecutiveSummary
            assessmentId={assessment.id}
            executiveSummary={assessment.executive_summary}
            lastSummaryGeneratedAt={assessment.last_summary_generated_at}
            onRegenerateClick={() => {
              console.log('Regenerate summary clicked');
              // This would need to be implemented based on your regeneration logic
            }}
            isRegenerating={false}
          />
        </div>
      )}

      {/* Address Map Display */}
      {assessment.latitude && assessment.longitude && (
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-6 w-6 mr-2 text-primary" />
                Site Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AddressMapDisplay 
                latitude={assessment.latitude} 
                longitude={assessment.longitude} 
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Metrics by Category - Now with proper target values and signal scores */}
      {sortedCategories.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Assessment Metrics</h2>
          {isLoadingTargetMetrics ? (
            <div className="text-center p-6">
              <div className="text-lg">Loading target metrics...</div>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedCategories.map((category) => {
                const metrics = metricsByCategory[category];
                console.log('[DEBUG] Rendering category:', category, 'with metrics:', metrics);
                
                const processedMetrics = metrics.map(metric => {
                  const targetData = targetMetricsMap[metric.metric_identifier];
                  
                  console.log('[DEBUG] Processing metric for display:', {
                    metricIdentifier: metric.metric_identifier,
                    label: metric.label,
                    enteredValue: metric.entered_value,
                    foundTargetData: !!targetData,
                    targetData: targetData
                  });
                  
                  return {
                    id: metric.id || `${metric.category}-${metric.label}`,
                    metric_identifier: metric.metric_identifier || metric.label,
                    label: metric.label,
                    category: metric.category,
                    entered_value: metric.entered_value,
                    notes: metric.notes,
                    target_value: targetData?.target_value,
                    higher_is_better: targetData?.higher_is_better,
                    measurement_type: targetData?.measurement_type,
                  };
                });
                
                console.log('[DEBUG] Processed metrics for category', category, ':', processedMetrics);
                
                return (
                  <MetricDisplaySection
                    key={category}
                    categoryName={category}
                    categoryDescription={`${metrics.length} metric${metrics.length !== 1 ? 's' : ''}`}
                    categoryMetrics={processedMetrics}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Site Visit Ratings - Now with the actual image */}
      {assessment.site_visit_ratings && assessment.site_visit_ratings.length > 0 && (
        <div className="mb-8">
          <SiteVisitRatingsSection
            siteVisitRatings={assessment.site_visit_ratings}
            siteVisitSectionImage={siteVisitSectionImage}
          />
        </div>
      )}

      {/* Empty States */}
      {Object.keys(metricsByCategory).length === 0 && (!assessment.site_visit_ratings || assessment.site_visit_ratings.length === 0) && (
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No assessment data available</p>
            <Button variant="outline" onClick={handleEdit} className="mt-4">
              <Edit className="mr-2 h-4 w-4" />
              Add Assessment Data
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Helper function for site status color (moved outside component for better organization)
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

export default SiteAssessmentDetailsView;
