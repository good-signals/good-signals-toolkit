
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { siteVisitCriteria, AssessmentSiteVisitRatingInsert, SiteVisitCriterionKey, SiteVisitRatingGrade } from '@/types/siteAssessmentTypes';
import { getSiteVisitRatings, saveSiteVisitRatings } from '@/services/siteAssessmentService';

interface InputSiteVisitRatingsStepProps {
  assessmentId: string;
  onSiteVisitRatingsSubmitted: (assessmentId: string) => void;
  onBack: () => void;
}

type SiteVisitRatingsFormData = Partial<Record<SiteVisitCriterionKey, { grade: SiteVisitRatingGrade | ''; notes: string }>>;

const InputSiteVisitRatingsStep: React.FC<InputSiteVisitRatingsStepProps> = ({
  assessmentId,
  onSiteVisitRatingsSubmitted,
  onBack,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<SiteVisitRatingsFormData>({});
  
  const { data: existingRatings, isLoading: isLoadingExistingRatings } = useQuery<AssessmentSiteVisitRatingInsert[], Error>({
    queryKey: ['siteVisitRatings', assessmentId],
    queryFn: () => getSiteVisitRatings(assessmentId),
    enabled: !!assessmentId,
  });

  // Initialize form data with existing ratings when they load
  useEffect(() => {
    if (existingRatings) {
      const initialData: SiteVisitRatingsFormData = {};
      siteVisitCriteria.forEach(criterion => {
        const existing = existingRatings.find(r => r.criterion_key === criterion.key);
        initialData[criterion.key] = {
          grade: existing?.rating_grade || '',
          notes: existing?.notes || '',
        };
      });
      setFormData(initialData);
    }
  }, [existingRatings]);

  const mutation = useMutation({
    mutationFn: (ratingsToSave: AssessmentSiteVisitRatingInsert[]) => saveSiteVisitRatings(assessmentId, ratingsToSave),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Site visit ratings saved successfully.' });
      queryClient.invalidateQueries({ queryKey: ['siteVisitRatings', assessmentId] });
      onSiteVisitRatingsSubmitted(assessmentId);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: `Failed to save ratings: ${error.message}`, variant: 'destructive' });
    },
  });

  const handleInputChange = (
    criterionKey: SiteVisitCriterionKey,
    field: 'grade' | 'notes',
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      [criterionKey]: {
        ...(prev[criterionKey] || { grade: '', notes: '' }),
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const ratingsToSave: AssessmentSiteVisitRatingInsert[] = siteVisitCriteria
      .map(criterion => {
        const ratingData = formData[criterion.key];
        if (ratingData && ratingData.grade) {
          const gradeDetail = criterion.grades.find(g => g.grade === ratingData.grade);
          return {
            assessment_id: assessmentId,
            criterion_key: criterion.key,
            rating_grade: ratingData.grade as SiteVisitRatingGrade, // Ensure grade is not ''
            rating_description: gradeDetail?.description || '',
            notes: ratingData.notes || null, // Ensure notes is null if empty string
          };
        }
        return null;
      })
      .filter(Boolean) as AssessmentSiteVisitRatingInsert[];

    if (ratingsToSave.length === 0 && !Object.values(formData).some(fd => fd.grade || fd.notes)) {
        // If nothing was entered and nothing to save, consider it a "skip" or successful empty submission.
        toast({ title: 'No Ratings Entered', description: 'Proceeding without new site visit ratings.' });
        onSiteVisitRatingsSubmitted(assessmentId);
        return;
    }
    
    mutation.mutate(ratingsToSave);
  };
  
  // Initialize form data if not already populated by existing ratings
  useEffect(() => {
    if (!isLoadingExistingRatings && Object.keys(formData).length === 0) {
      const initialData: SiteVisitRatingsFormData = {};
      siteVisitCriteria.forEach(criterion => {
        initialData[criterion.key] = { grade: '', notes: '' };
      });
      setFormData(initialData);
    }
  }, [isLoadingExistingRatings, formData]);


  if (isLoadingExistingRatings) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading site visit ratings form...</p>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Site Assessment - Step 4: Site Visit Ratings</CardTitle>
        <CardDescription>
          Provide subjective ratings based on your on-site observations for assessment ID: {assessmentId}.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {siteVisitCriteria.map(criterion => (
            <div key={criterion.key} className="p-4 border rounded-md">
              <h3 className="text-lg font-semibold mb-1">{criterion.label}</h3>
              <p className="text-sm text-muted-foreground mb-3">{criterion.description}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div className="md:col-span-1">
                  <Label htmlFor={`grade-${criterion.key}`}>Grade</Label>
                  <Select
                    value={formData[criterion.key]?.grade || ''}
                    onValueChange={(value) => handleInputChange(criterion.key, 'grade', value)}
                  >
                    <SelectTrigger id={`grade-${criterion.key}`}>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=""><em>No Grade</em></SelectItem>
                      {criterion.grades.map(grade => (
                        <SelectItem key={grade.grade} value={grade.grade}>
                          {grade.grade} - {grade.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor={`notes-${criterion.key}`}>Notes</Label>
                  <Textarea
                    id={`notes-${criterion.key}`}
                    value={formData[criterion.key]?.notes || ''}
                    onChange={(e) => handleInputChange(criterion.key, 'notes', e.target.value)}
                    placeholder="Optional notes..."
                    rows={2}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onBack} disabled={mutation.isPending}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Ratings & View Summary
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default InputSiteVisitRatingsStep;
