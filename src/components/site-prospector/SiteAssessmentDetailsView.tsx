
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit } from 'lucide-react';
import { SiteAssessment } from '@/types/siteAssessmentTypes';
import { useTargetMetricsDraft } from '@/hooks/useTargetMetricsDraft';
import { formatDate } from '@/lib/utils';

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
  const { loadDraft } = useTargetMetricsDraft();

  const handleEdit = () => {
    if (assessment.target_metric_set_id) {
      loadDraft();
    }
    onEditGoToInputMetrics();
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-4xl">
      <div className="mb-8">
        <Button variant="ghost" onClick={onBackToList}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Assessments
        </Button>
        <h1 className="text-3xl font-bold text-primary mt-4">{assessment.assessment_name}</h1>
        <p className="text-muted-foreground">
          {assessment.address_line1}, {assessment.city}
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Assessment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold">Address</h3>
                <p>{assessment.address_line1}</p>
                {assessment.address_line2 && <p>{assessment.address_line2}</p>}
                <p>{assessment.city}, {assessment.state_province} {assessment.postal_code}</p>
              </div>
              <div>
                <h3 className="font-semibold">Created</h3>
                <p>{formatDate(assessment.created_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Assessment
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SiteAssessmentDetailsView;
