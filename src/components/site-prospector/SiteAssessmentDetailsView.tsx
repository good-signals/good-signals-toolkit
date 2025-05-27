
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MapPin, Tag, ListChecks, Edit3, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getSiteAssessmentById } from '@/services/siteAssessmentService';
import { getTargetMetricSetById } from '@/services/targetMetricsService';
import { getAssessmentMetricValues } from '@/services/siteAssessmentService';
import { SiteAssessment } from '@/types/siteAssessmentTypes';
import { TargetMetricSet, UserCustomMetricSetting } from '@/types/targetMetrics';
import { AssessmentMetricValue } from '@/types/siteAssessmentTypes';
import { useAuth } from '@/contexts/AuthContext';

interface SiteAssessmentDetailsViewProps {
  assessmentId: string;
  metricSetId: string;
  onBack: ()
 => void;
  // onEdit: () => void; // Placeholder for future edit functionality
}

const SiteAssessmentDetailsView: React.FC<SiteAssessmentDetailsViewProps> = ({
  assessmentId,
  metricSetId,
  onBack,
  // onEdit,
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

  if (isLoadingAssessment || isLoadingMetricSet || isLoadingMetricValues) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading assessment details...</p>
      </div>
    );
  }

  if (assessmentError || metricSetError || metricValuesError) {
    return (
      <div className="container mx-auto py-10 px-4 text-center">
        <p className="text-destructive text-xl">
          Error loading assessment details: {assessmentError?.message || metricSetError?.message || metricValuesError?.message}
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

  // Group metric values by category
  const metricsByCategory: Record<string, (AssessmentMetricValue & { target?: number, higher_is_better?: boolean })[]> = {};
  metricValues?.forEach(mv => {
    if (!metricsByCategory[mv.category]) {
      metricsByCategory[mv.category] = [];
    }
    const originalMetric = metricSet?.user_custom_metrics_settings?.find(
      m => m.metric_identifier === mv.metric_identifier
    );
    metricsByCategory[mv.category].push({
        ...mv,
        target: originalMetric?.target_value,
        higher_is_better: originalMetric?.higher_is_better
    });
  });

  return (
    <div className="container mx-auto py-10 px-4 space-y-8">
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
            {/* <Button variant="outline" onClick={onEdit}><Edit3 className="mr-2 h-4 w-4" /> Edit</Button> */}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold flex items-center">
            <ListChecks className="h-6 w-6 mr-2 text-primary" />
            Metric Values
          </CardTitle>
          <CardDescription>
            Detailed breakdown of the metric values recorded for this assessment.
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
                        <TableHead className="w-[30%]">Metric</TableHead>
                        <TableHead className="text-right w-[15%]">Entered Value</TableHead>
                        <TableHead className="text-right w-[15%]">Target Value</TableHead>
                        <TableHead className="w-[40%]">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {values.map((mv) => (
                        <TableRow key={mv.id}>
                          <TableCell className="font-medium">{mv.label}</TableCell>
                          <TableCell className="text-right">{mv.entered_value}</TableCell>
                          <TableCell className="text-right">
                            {mv.target !== undefined ? mv.target : 'N/A'}
                            {mv.higher_is_better !== undefined && mv.target !== undefined && (
                                <Badge variant={mv.higher_is_better ? (mv.entered_value >= mv.target ? "success" : "destructive") : (mv.entered_value <= mv.target ? "success" : "destructive")} className="ml-2 text-xs">
                                    {mv.higher_is_better ? (mv.entered_value >= mv.target ? "Good" : "Below Target") : (mv.entered_value <= mv.target ? "Good" : "Above Target")}
                                </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground italic">
                            {mv.notes || 'No notes'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No metric values have been recorded for this assessment yet.</p>
          )}
        </CardContent>
      </Card>
      
      {/* Placeholder for Site Visit Ratings - can be a new Card */}
      {/* 
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Site Visit Ratings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Site visit ratings will be displayed here. (Coming Soon)</p>
        </CardContent>
      </Card>
      */}

      <div className="mt-8 flex justify-start">
        <Button onClick={onBack} variant="outline" size="lg">
          <ArrowLeft className="mr-2 h-5 w-5" /> Back to Prospector Home
        </Button>
      </div>
    </div>
  );
};

export default SiteAssessmentDetailsView;

