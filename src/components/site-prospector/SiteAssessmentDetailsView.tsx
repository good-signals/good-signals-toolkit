import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MapPin, Calendar, User, FileText, Download, Edit3, Star, Target } from 'lucide-react';
import { useSiteAssessmentOperations } from '@/hooks/useSiteAssessmentOperations';
import { useTargetMetricsDraft } from '@/hooks/useTargetMetricsDraft';
import { Account } from '@/services/account';
import { SiteAssessment } from '@/types/siteAssessmentTypes';
import { formatDate } from '@/lib/utils';

interface SiteAssessmentDetailsProps {
  account: Account | null;
}

const SiteAssessmentDetailsView: React.FC<SiteAssessmentDetailsProps> = ({ account }) => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const [siteAssessment, setSiteAssessment] = useState<SiteAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { fetchSiteAssessmentById } = useSiteAssessmentOperations();
  const { targetMetricsDraft } = useTargetMetricsDraft();

  useEffect(() => {
    const loadSiteAssessment = async () => {
      if (assessmentId) {
        setIsLoading(true);
        try {
          const assessment = await fetchSiteAssessmentById(assessmentId);
          setSiteAssessment(assessment);
        } catch (error) {
          console.error("Failed to load site assessment:", error);
          // Optionally, display an error message to the user
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadSiteAssessment();
  }, [assessmentId, fetchSiteAssessmentById]);

  if (isLoading) {
    return <div>Loading site assessment details...</div>;
  }

  if (!siteAssessment) {
    return <div>Site assessment not found.</div>;
  }

  const addressDisplay = [
    siteAssessment.address_line1,
    siteAssessment.address_line2,
    siteAssessment.city,
    siteAssessment.state_province,
    siteAssessment.postal_code,
    siteAssessment.country
  ].filter(Boolean).join(', ');

  return (
    <div className="container mx-auto py-8">
      <div className="mb-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            {siteAssessment.assessment_name || "Site Assessment Details"}
            <Badge className="ml-2">{siteAssessment.site_status || "Draft"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Address:</p>
              <p className="text-muted-foreground">
                {addressDisplay || 'No address provided'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Site Signal Score:</p>
              <p className="text-muted-foreground">{siteAssessment.site_signal_score || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Completion:</p>
              <p className="text-muted-foreground">{siteAssessment.completion_percentage || '0'}%</p>
            </div>
            <div>
              <p className="text-sm font-medium">Target Metric Set:</p>
               {targetMetricsDraft ? (
                  <p className="text-muted-foreground">{targetMetricsDraft.name || 'N/A'}</p>
                ) : (
                  <p className="text-muted-foreground">N/A</p>
                )}
            </div>
          </div>

          <Separator />

          <div className="flex justify-between">
            <div className="space-x-2">
              <Button variant="outline" asChild>
                <Link to={`/site-assessment-form/${assessmentId}`}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit Assessment
                </Link>
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </Button>
            </div>
            <div className="space-x-2">
              <Button variant="secondary">
                <FileText className="mr-2 h-4 w-4" />
                Generate Summary
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SiteAssessmentDetailsView;
