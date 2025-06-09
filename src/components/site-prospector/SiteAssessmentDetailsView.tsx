
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, FileText, MapPin, Calendar, CheckCircle, BarChart2 } from 'lucide-react';
import { SiteAssessment } from '@/types/siteAssessmentTypes';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import SiteStatusSelector from './SiteStatusSelector';
import { updateSiteStatus } from '@/services/siteAssessment/statusUpdates';
import { toast } from 'sonner';
import AddressMapDisplay from './AddressMapDisplay';
import EditableExecutiveSummary from './EditableExecutiveSummary';
import MetricDisplaySection from './display/MetricDisplaySection';
import OverallScoreDisplay from './OverallScoreDisplay';
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
    if (score === null || score === undefined) return "bg-gray-200 text-gray-700";
    if (score >= 0.75) return "bg-green-100 text-green-800";
    if (score >= 0.5) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const formatPercentage = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "N/A";
    return `${Math.round(value * 100)}%`;
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-5xl">
      {/* Header Section */}
      <div className="mb-8">
        <Button variant="ghost" onClick={onBackToList} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Assessments
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">{assessment.assessment_name}</h1>
            <div className="flex items-center text-muted-foreground mt-1">
              <MapPin className="h-4 w-4 mr-1" />
              <p>{assessment.address_line1}, {assessment.city}, {assessment.state_province} {assessment.postal_code}</p>
            </div>
            <div className="flex items-center text-muted-foreground mt-1">
              <Calendar className="h-4 w-4 mr-1" />
              <p>Created {formatDate(assessment.created_at)}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Assessment
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Site Status</CardTitle>
          </CardHeader>
          <CardContent>
            <SiteStatusSelector 
              value={currentStatus}
              onValueChange={handleStatusChange}
              showBadge={true}
            />
            {isUpdatingStatus && (
              <p className="text-xs text-muted-foreground mt-1">Updating...</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Signal Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <BarChart2 className="h-5 w-5 mr-2 text-primary" />
              <span className={`text-2xl font-bold px-2 py-1 rounded ${getSignalScoreColor()}`}>
                {assessment.site_signal_score !== null && assessment.site_signal_score !== undefined 
                  ? formatPercentage(assessment.site_signal_score)
                  : "Not calculated"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-primary" />
              <span className="text-2xl font-bold">
                {assessment.completion_percentage !== null && assessment.completion_percentage !== undefined 
                  ? `${Math.round(assessment.completion_percentage)}%`
                  : "Not calculated"}
              </span>
            </div>
          </CardContent>
        </Card>
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

      {/* Overall Score Display */}
      <div className="mb-8">
        <OverallScoreDisplay 
          overallScore={assessment.site_signal_score ? assessment.site_signal_score * 100 : null}
          scoreChange={null}
        />
      </div>

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
