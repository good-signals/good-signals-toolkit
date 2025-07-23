
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
  const [isFormReady, setIsFormReady] = useState(false);
  
  const { data: existingRatings, isLoading: isLoadingExistingRatings } = useQuery<AssessmentSiteVisitRatingInsert[], Error>({
    queryKey: ['siteVisitRatings', assessmentId],
    queryFn: () => getSiteVisitRatings(assessmentId),
    enabled: !!assessmentId,
  });

  // Single useEffect to handle all form initialization - both existing and new ratings
  useEffect(() => {
    console.log('[InputSiteVisitRatingsStep] Initializing form data...');
    console.log('[InputSiteVisitRatingsStep] Loading state:', isLoadingExistingRatings);
    console.log('[InputSiteVisitRatingsStep] Existing ratings:', existingRatings);

    if (!isLoadingExistingRatings) {
      const initialData: SiteVisitRatingsFormData = {};
      
      // Initialize all criteria with defaults first
      siteVisitCriteria.forEach(criterion => {
        initialData[criterion.key] = { grade: '', notes: '' };
      });

      // If there are existing ratings, merge them in
      if (existingRatings && existingRatings.length > 0) {
        console.log('[InputSiteVisitRatingsStep] Found existing ratings, merging with defaults');
        existingRatings.forEach(rating => {
          if (initialData[rating.criterion_key]) {
            initialData[rating.criterion_key] = {
              grade: rating.rating_grade || '',
              notes: rating.notes || '',
            };
            console.log('[InputSiteVisitRatingsStep] Loaded rating for', rating.criterion_key, ':', {
              grade: rating.rating_grade,
              notes: rating.notes
            });
          }
        });
      } else {
        console.log('[InputSiteVisitRatingsStep] No existing ratings found, using empty defaults');
      }

      console.log('[InputSiteVisitRatingsStep] Setting form data:', initialData);
      setFormData(initialData);
      setIsFormReady(true);
    }
  }, [existingRatings, isLoadingExistingRatings]);

  // Debug form data changes
  useEffect(() => {
    if (isFormReady) {
      console.log('[InputSiteVisitRatingsStep] Form ready with data:', {
        criteriaCount: Object.keys(formData).length,
        sampleData: formData.visibility,
        formReady: isFormReady
      });
    }
  }, [formData, isFormReady]);

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
    console.log('[InputSiteVisitRatingsStep] Input change:', criterionKey, field, value);
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
        // Only save if there's a grade (empty string means no grade selected)
        if (ratingData && ratingData.grade) {
          const gradeDetail = criterion.grades.find(g => g.grade === ratingData.grade);
          return {
            assessment_id: assessmentId,
            criterion_key: criterion.key,
            rating_grade: ratingData.grade as SiteVisitRatingGrade,
            rating_description: gradeDetail?.description || '',
            notes: ratingData.notes || null,
          };
        }
        return null;
      })
      .filter(Boolean) as AssessmentSiteVisitRatingInsert[];

    if (ratingsToSave.length === 0 && !Object.values(formData).some(fd => fd.grade || fd.notes)) {
        toast({ title: 'No Ratings Entered', description: 'Proceeding without new site visit ratings.' });
        onSiteVisitRatingsSubmitted(assessmentId);
        return;
    }
    
    mutation.mutate(ratingsToSave);
  };

  if (isLoadingExistingRatings) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading site visit ratings form...</p>
      </div>
    );
  }

  // Don't render form until it's ready with data
  if (!isFormReady) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Preparing site visit ratings form...</p>
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
                    value={formData[criterion.key]?.grade || 'none'}
                    onValueChange={(value) => handleInputChange(criterion.key, 'grade', value === 'none' ? '' : value)}
                  >
                    <SelectTrigger id={`grade-${criterion.key}`}>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none"><em>No Grade</em></SelectItem>
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
