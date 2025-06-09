
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, FileText, MapPin, Calendar, CheckCircle, BarChart2, TrendingUp, RefreshCcw, Export } from 'lucide-react';
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
  const [currentStatus, setCurrentStatus] = useState(assessment.site_status || 'Prospect');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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

  // Organize metric values by category if they exist
  const metricsByCategory: Record<string, typeof assessment.assessment_metric_values> = {};
  if (assessment.assessment_metric_values && assessment.assessment_metric_values.length > 0) {
    assessment.assessment_metric_values.forEach((metric) => {
      if (!metricsByCategory[metric.category]) {
        metricsByCategory[metric.category] = [];
      }
      metricsByCategory[metric.category].push(metric);
    });
  }

  const getSignalScoreColor = () => {
    const score = assessment.site_signal_score;
    if (score === null || score === undefined) return "text-muted-foreground";
    if (score >= 0.75) return "text-green-600";
    if (score >= 0.5) return "text-yellow-600";
    return "text-red-600";
  };

  const getSignalScoreLabel = () => {
    const score = assessment.site_signal_score;
    if (score === null || score === undefined) return "Not calculated";
    if (score >= 0.75) return "Good";
    if (score >= 0.5) return "Fair";
    return "Poor";
  };

  const formatPercentage = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "N/A";
    return `${Math.round(value * 100)}%`;
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
            
            <div className="flex items-center text-muted-foreground mb-1">
              <span className="font-medium">Address:</span>
              <span className="ml-2">{assessment.address_line1}</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center">
                <span className="font-medium">Site Status:</span>
                <SiteStatusSelector 
                  value={currentStatus}
                  onValueChange={handleStatusChange}
                  showBadge={true}
                  className="ml-2"
                />
              </div>
              
              <div className="flex items-center">
                <span className="font-medium">Target Metric Set:</span>
                <span className="ml-2">Test Targets 1</span>
                <span className="ml-1 text-muted-foreground">(20 metrics)</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Recalculate Scores
            </Button>
            <Button variant="outline">
              <Export className="mr-2 h-4 w-4" />
              Export Assessment
            </Button>
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
                    <span className={`text-lg ${getSignalScoreColor()}`}>
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

      {/* Metrics by Category */}
      {Object.keys(metricsByCategory).length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Assessment Metrics</h2>
          <div className="space-y-6">
            {Object.entries(metricsByCategory).map(([category, metrics]) => (
              <MetricDisplaySection
                key={category}
                categoryName={category}
                categoryDescription={`${metrics.length} metric${metrics.length !== 1 ? 's' : ''}`}
                categoryMetrics={metrics.map(metric => ({
                  id: metric.id || `${metric.category}-${metric.label}`,
                  metric_identifier: metric.metric_identifier || metric.label,
                  label: metric.label,
                  category: metric.category,
                  entered_value: metric.entered_value,
                  notes: metric.notes,
                  target_value: undefined, // This would need to come from metric definitions
                  higher_is_better: undefined, // This would need to come from metric definitions
                  measurement_type: undefined, // This would need to come from metric definitions
                }))}
              />
            ))}
          </div>
        </div>
      )}

      {/* Site Visit Ratings */}
      {assessment.site_visit_ratings && assessment.site_visit_ratings.length > 0 && (
        <div className="mb-8">
          <SiteVisitRatingsSection
            siteVisitRatings={assessment.site_visit_ratings}
            siteVisitSectionImage={null}
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

export default SiteAssessmentDetailsView;
