
import React from 'react';
import { ListChecks } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from "@/components/ui/badge";
import { AssessmentSiteVisitRatingInsert, siteVisitCriteria } from '@/types/siteAssessmentTypes';

interface SiteVisitRatingsSectionProps {
  siteVisitRatings: AssessmentSiteVisitRatingInsert[];
  siteVisitSectionImage?: string | null;
}

const SiteVisitRatingsSection: React.FC<SiteVisitRatingsSectionProps> = ({
  siteVisitRatings,
  siteVisitSectionImage,
}) => {
  if (!siteVisitRatings || siteVisitRatings.length === 0) return null;

  return (
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
  );
};

export default SiteVisitRatingsSection;
