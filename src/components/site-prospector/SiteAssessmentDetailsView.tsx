import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, FileText, MapPin, Calendar, CheckCircle, BarChart2 } from 'lucide-react';
import { SiteAssessment } from '@/types/siteAssessmentTypes';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import SiteStatusSelector from './SiteStatusSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { updateSiteStatus } from '@/services/siteAssessment/statusUpdates';
import { toast } from 'sonner';

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

      {assessment.executive_summary && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line">{assessment.executive_summary}</p>
            {assessment.last_summary_generated_at && (
              <p className="text-sm text-muted-foreground mt-4">
                Last updated: {formatDate(assessment.last_summary_generated_at)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="metrics" className="w-full">
        <TabsList>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="siteVisit">Site Visit</TabsTrigger>
        </TabsList>
        
        <TabsContent value="metrics">
          {Object.keys(metricsByCategory).length > 0 ? (
            <div className="grid gap-6">
              {Object.entries(metricsByCategory).map(([category, metrics]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle>{category}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {metrics.map((metric) => (
                        <div key={metric.id} className="border-b pb-4 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{metric.label}</h4>
                              <p className="text-muted-foreground">Value: {metric.entered_value}</p>
                              {metric.notes && (
                                <p className="text-muted-foreground mt-1">{metric.notes}</p>
                              )}
                            </div>
                            {metric.image_url && (
                              <div className="ml-4">
                                <img 
                                  src={metric.image_url} 
                                  alt={metric.label} 
                                  className="h-24 w-24 object-cover rounded-md" 
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">No metrics data available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="siteVisit">
          <Card>
            <CardHeader>
              <CardTitle>Site Visit Ratings</CardTitle>
            </CardHeader>
            <CardContent>
              {assessment.site_visit_ratings && assessment.site_visit_ratings.length > 0 ? (
                <div className="grid gap-4">
                  {assessment.site_visit_ratings.map((rating) => (
                    <div key={rating.id} className="border-b pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{rating.criterion_key}</h4>
                            <Badge>{rating.rating_grade}</Badge>
                          </div>
                          {rating.rating_description && (
                            <p className="text-muted-foreground">{rating.rating_description}</p>
                          )}
                          {rating.notes && (
                            <p className="text-muted-foreground mt-1">{rating.notes}</p>
                          )}
                        </div>
                        {rating.image_url && (
                          <div className="ml-4">
                            <img 
                              src={rating.image_url} 
                              alt={rating.criterion_key} 
                              className="h-24 w-24 object-cover rounded-md" 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No site visit ratings available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SiteAssessmentDetailsView;
