
import React, { useEffect } from 'react';
import { useForm, useFieldArray, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowRight, ArrowLeft, Info } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTargetMetricSetById } from '@/services/targetMetricsService';
import { saveAssessmentMetricValues, getAssessmentMetricValues, getSiteVisitRatings, saveSiteVisitRatings } from '@/services/siteAssessmentService';
import { TargetMetricSet, UserCustomMetricSetting } from '@/types/targetMetrics';
import { AssessmentMetricValueInsert, siteVisitCriteria, SiteVisitCriterionKey, SiteVisitRatingGrade, AssessmentSiteVisitRatingInsert } from '@/types/siteAssessmentTypes';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger
} from "@/components/ui/tabs";

const metricValueSchema = z.object({
  metric_identifier: z.string(),
  label: z.string(),
  category: z.string(),
  entered_value: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : parseFloat(String(val))),
    z.number({ required_error: "Value is required" }).min(-Infinity).max(Infinity)
  ),
  measurement_type: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const formSchema = z.object({
  metrics: z.array(metricValueSchema),
});

type MetricValuesFormData = z.infer<typeof formSchema>;

type SiteVisitRatingsFormData = Partial<Record<SiteVisitCriterionKey, { grade: SiteVisitRatingGrade | ''; notes: string }>>;

interface InputMetricValuesStepProps {
  assessmentId: string;
  targetMetricSetId: string;
  onMetricsSubmitted: (assessmentId: string) => void;
  onBack: () => void;
}

const metricDropdownOptions: Record<string, Array<{ label: string; value: number }>> = {
  market_saturation_trade_area_overlap: [
    { label: "No Overlap", value: 100 },
    { label: "Some Overlap", value: 50 },
    { label: "Major Overlap", value: 0 },
  ],
  market_saturation_heat_map_intersection: [
    { label: "Cold Spot", value: 100 },
    { label: "Warm Spot", value: 50 },
    { label: "Hot Spot", value: 0 },
  ],
  demand_supply_balance: [
    { label: "Positive Demand", value: 100 },
    { label: "Equal Demand", value: 50 },
    { label: "Negative Demand", value: 0 },
  ],
};

const specificDropdownMetrics = Object.keys(metricDropdownOptions);

const InputMetricValuesStep: React.FC<InputMetricValuesStepProps> = ({
  assessmentId,
  targetMetricSetId,
  onMetricsSubmitted,
  onBack,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("metrics");
  const [siteVisitRatingsForm, setSiteVisitRatingsForm] = React.useState<SiteVisitRatingsFormData>({});

  // Metrics Tab Queries and State
  const { data: metricSet, isLoading: isLoadingMetricSet, error: metricSetError } = useQuery<TargetMetricSet | null, Error>({
    queryKey: ['targetMetricSet', targetMetricSetId, user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error('User not authenticated');
      return getTargetMetricSetById(targetMetricSetId, user.id);
    },
    enabled: !!user?.id && !!targetMetricSetId,
  });

  const { data: existingMetricValues, isLoading: isLoadingExistingValues } = useQuery({
    queryKey: ['assessmentMetricValues', assessmentId],
    queryFn: () => getAssessmentMetricValues(assessmentId),
    enabled: !!assessmentId,
  });
  
  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MetricValuesFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { metrics: [] },
  });

  const { fields, append, replace } = useFieldArray({
    control,
    name: "metrics",
  });

  // Site Visit Ratings Tab Queries and State
  const { data: existingSiteVisitRatings, isLoading: isLoadingSiteVisitRatings } = useQuery({
    queryKey: ['siteVisitRatings', assessmentId],
    queryFn: () => getSiteVisitRatings(assessmentId),
    enabled: !!assessmentId,
  });

  // Initialize metric form data
  useEffect(() => {
    if (metricSet?.user_custom_metrics_settings && metricSet.user_custom_metrics_settings.length > 0) {
      const initialMetrics = metricSet.user_custom_metrics_settings.map(metric => {
        const existingValue = existingMetricValues?.find(ev => ev.metric_identifier === metric.metric_identifier);
        
        let defaultValue: number;
        if (existingValue?.entered_value !== undefined && existingValue?.entered_value !== null) {
          defaultValue = existingValue.entered_value;
        } else if (specificDropdownMetrics.includes(metric.metric_identifier)) {
          defaultValue = 50; 
        } else {
          defaultValue = metric.measurement_type === 'Index' ? 50 : 0;
        }

        return {
          metric_identifier: metric.metric_identifier,
          label: metric.label,
          category: metric.category,
          entered_value: defaultValue,
          measurement_type: metric.measurement_type,
          notes: existingValue?.notes ?? '',
          target_value: metric.target_value,
          higher_is_better: metric.higher_is_better,
        };
      });
      replace(initialMetrics);
    } else if (metricSet && metricSet.user_custom_metrics_settings?.length === 0) {
      replace([]);
    }
  }, [metricSet, existingMetricValues, replace]);

  // Initialize site visit ratings form data
  useEffect(() => {
    if (existingSiteVisitRatings) {
      const initialData: SiteVisitRatingsFormData = {};
      siteVisitCriteria.forEach(criterion => {
        const existing = existingSiteVisitRatings.find(r => r.criterion_key === criterion.key);
        initialData[criterion.key] = {
          grade: existing?.rating_grade || '',
          notes: existing?.notes || '',
        };
      });
      setSiteVisitRatingsForm(initialData);
    } else {
      const initialData: SiteVisitRatingsFormData = {};
      siteVisitCriteria.forEach(criterion => {
        initialData[criterion.key] = { grade: '', notes: '' };
      });
      setSiteVisitRatingsForm(initialData);
    }
  }, [existingSiteVisitRatings]);

  // Mutations
  const metricsMutation = useMutation({
    mutationFn: (data: AssessmentMetricValueInsert[]) => {
        if (!user?.id) throw new Error('User not authenticated');
        return saveAssessmentMetricValues(assessmentId, data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Metric values saved." });
      queryClient.invalidateQueries({ queryKey: ['assessmentMetricValues', assessmentId] });
      setActiveTab("site-visit"); // Switch to site visit tab on success
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `Failed to save metric values: ${error.message}`, variant: "destructive" });
    },
  });

  const siteVisitRatingsMutation = useMutation({
    mutationFn: (ratingsToSave: AssessmentSiteVisitRatingInsert[]) => saveSiteVisitRatings(assessmentId, ratingsToSave),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Site visit ratings saved successfully.' });
      queryClient.invalidateQueries({ queryKey: ['siteVisitRatings', assessmentId] });
      onMetricsSubmitted(assessmentId); // Proceed to the final step
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: `Failed to save ratings: ${error.message}`, variant: 'destructive' });
    },
  });

  // Form submission handlers
  const onSubmitMetrics: SubmitHandler<MetricValuesFormData> = (data) => {
    const payload: AssessmentMetricValueInsert[] = data.metrics.map(m => ({
      assessment_id: assessmentId,
      metric_identifier: m.metric_identifier,
      label: m.label,
      category: m.category,
      entered_value: m.entered_value,
      measurement_type: m.measurement_type,
      notes: m.notes,
    }));
    metricsMutation.mutate(payload);
  };

  const handleSiteVisitRatingsSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const ratingsToSave: AssessmentSiteVisitRatingInsert[] = siteVisitCriteria
      .map(criterion => {
        const ratingData = siteVisitRatingsForm[criterion.key];
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

    if (ratingsToSave.length === 0) {
      toast({ title: 'No Ratings Entered', description: 'Proceeding without site visit ratings.' });
      onMetricsSubmitted(assessmentId);
      return;
    }
    
    siteVisitRatingsMutation.mutate(ratingsToSave);
  };

  const handleSiteVisitInputChange = (
    criterionKey: SiteVisitCriterionKey,
    field: 'grade' | 'notes',
    value: string
  ) => {
    setSiteVisitRatingsForm(prev => ({
      ...prev,
      [criterionKey]: {
        ...(prev[criterionKey] || { grade: '', notes: '' }),
        [field]: value,
      },
    }));
  };

  const handleSkipSiteVisit = () => {
    toast({ title: "Skipped", description: "Site Visit Ratings skipped." });
    onMetricsSubmitted(assessmentId);
  };

  const metricsByCategory = fields.reduce((acc, field, index) => {
    const typedField = field as unknown as UserCustomMetricSetting & { id: string; entered_value: number; notes?: string | null }; // Cast for target_value etc.
    const category = typedField.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({ ...typedField, originalIndex: index }); // Store original index
    return acc;
  }, {} as Record<string, Array<UserCustomMetricSetting & { id: string; originalIndex: number; entered_value: number; notes?: string | null }>>);

  if (isLoadingMetricSet || isLoadingExistingValues || isLoadingSiteVisitRatings) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading data...</p></div>;
  }

  if (metricSetError) {
    return <p className="text-destructive text-center p-4">Error loading metric set: {metricSetError.message}</p>;
  }

  if (!metricSet || !metricSet.user_custom_metrics_settings || metricSet.user_custom_metrics_settings.length === 0) {
    // If no metrics, just show the site visit ratings tab
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Step 3: Site Visit Ratings</CardTitle>
          <CardDescription>
            The selected Target Metric Set ({metricSet?.name || 'Unknown'}) has no custom metrics defined.
            Please provide site visit ratings below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSiteVisitRatingsSubmit} className="space-y-6">
            {siteVisitCriteria.map(criterion => (
              <div key={criterion.key} className="p-4 border rounded-md">
                <h3 className="text-lg font-semibold mb-1">{criterion.label}</h3>
                <p className="text-sm text-muted-foreground mb-3">{criterion.description}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <div className="md:col-span-1">
                    <Label htmlFor={`grade-${criterion.key}`}>Grade</Label>
                    <Select
                      value={siteVisitRatingsForm[criterion.key]?.grade || ''}
                      onValueChange={(value) => handleSiteVisitInputChange(criterion.key, 'grade', value)}
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
                      value={siteVisitRatingsForm[criterion.key]?.notes || ''}
                      onChange={(e) => handleSiteVisitInputChange(criterion.key, 'notes', e.target.value)}
                      placeholder="Optional notes..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ))}
            <div className="flex justify-between mt-6">
              <Button type="button" variant="outline" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <div className="space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleSkipSiteVisit}
                  disabled={siteVisitRatingsMutation.isPending}
                >
                  Skip Site Visit
                </Button>
                <Button 
                  type="submit" 
                  disabled={siteVisitRatingsMutation.isPending}
                >
                  {siteVisitRatingsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Finish Assessment <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <TooltipProvider>
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Step 3: Assessment Data for "{metricSet.name}"</CardTitle>
          <CardDescription>
            Enter metric values and site visit ratings to complete your assessment.
          </CardDescription>
        </CardHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="metrics">Metric Values</TabsTrigger>
              <TabsTrigger value="site-visit">Site Visit Ratings</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="metrics" className="mt-0 pt-2">
            <form onSubmit={handleSubmit(onSubmitMetrics)}>
              <CardContent className="space-y-8 pt-2">
                {Object.entries(metricsByCategory).map(([category, categoryMetrics]) => (
                  <div key={category} className="space-y-6 border-t pt-6 first:border-t-0 first:pt-0">
                    <h3 className="text-lg font-semibold text-primary">{category}</h3>
                    {categoryMetrics.map((metricField) => (
                      <div key={metricField.id} className="p-4 border rounded-md shadow-sm bg-card">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                          <div>
                            <Label htmlFor={`metrics.${metricField.originalIndex}.entered_value`} className="flex items-center">
                              {metricField.label}
                              <Tooltip delayDuration={100}>
                                <TooltipTrigger asChild>
                                  <Info className="h-3 w-3 ml-1.5 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p>Target: {metricField.target_value} ({metricField.higher_is_better ? "Higher is better" : "Lower is better"})</p>
                                  {metricField.measurement_type && <p>Type: {metricField.measurement_type}</p>}
                                </TooltipContent>
                              </Tooltip>
                            </Label>
                            
                            {specificDropdownMetrics.includes(metricField.metric_identifier) ? (
                              <Controller
                                name={`metrics.${metricField.originalIndex}.entered_value`}
                                control={control}
                                render={({ field }) => (
                                  <Select
                                    value={field.value !== null && field.value !== undefined ? String(field.value) : ""}
                                    onValueChange={(value) => field.onChange(parseFloat(value))}
                                  >
                                    <SelectTrigger id={`metrics.${metricField.originalIndex}.entered_value`} className="mt-1">
                                      <SelectValue placeholder={`Select value for ${metricField.label}`} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {metricDropdownOptions[metricField.metric_identifier].map(option => (
                                        <SelectItem key={option.value} value={String(option.value)}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            ) : (
                              <Controller
                                name={`metrics.${metricField.originalIndex}.entered_value`}
                                control={control}
                                render={({ field }) => (
                                  <Input
                                    {...field}
                                    id={`metrics.${metricField.originalIndex}.entered_value`}
                                    type="number"
                                    step="any"
                                    placeholder={`Enter value for ${metricField.label}`}
                                    className="mt-1"
                                    value={field.value === null || field.value === undefined ? '' : String(field.value)}
                                    onChange={e => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                                  />
                                )}
                              />
                            )}
                            {errors.metrics?.[metricField.originalIndex]?.entered_value && (
                              <p className="text-sm text-destructive mt-1">{errors.metrics[metricField.originalIndex]?.entered_value?.message}</p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor={`metrics.${metricField.originalIndex}.notes`}>Notes (Optional)</Label>
                            <Controller
                              name={`metrics.${metricField.originalIndex}.notes`}
                              control={control}
                              render={({ field }) => (
                                <Textarea
                                  {...field}
                                  id={`metrics.${metricField.originalIndex}.notes`}
                                  placeholder="Any specific observations or context..."
                                  className="mt-1"
                                  value={field.value ?? ''}
                                  onChange={e => field.onChange(e.target.value)}
                                />
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </CardContent>
              <CardFooter className="flex justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 border-t">
                <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting || metricsMutation.isPending}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <div className="space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setActiveTab("site-visit")}
                    disabled={isSubmitting || metricsMutation.isPending}
                  >
                    Go to Site Visit
                  </Button>
                  <Button type="submit" disabled={isSubmitting || metricsMutation.isPending}>
                    {(isSubmitting || metricsMutation.isPending) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save & Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </form>
          </TabsContent>
          
          <TabsContent value="site-visit" className="mt-0">
            <form onSubmit={handleSiteVisitRatingsSubmit}>
              <CardContent className="space-y-6">
                {siteVisitCriteria.map(criterion => (
                  <div key={criterion.key} className="p-4 border rounded-md">
                    <h3 className="text-lg font-semibold mb-1">{criterion.label}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{criterion.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                      <div className="md:col-span-1">
                        <Label htmlFor={`grade-${criterion.key}`}>Grade</Label>
                        <Select
                          value={siteVisitRatingsForm[criterion.key]?.grade || ''}
                          onValueChange={(value) => handleSiteVisitInputChange(criterion.key, 'grade', value)}
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
                          value={siteVisitRatingsForm[criterion.key]?.notes || ''}
                          onChange={(e) => handleSiteVisitInputChange(criterion.key, 'notes', e.target.value)}
                          placeholder="Optional notes..."
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
              <CardFooter className="flex justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 border-t">
                <div>
                  <Button type="button" variant="outline" onClick={() => setActiveTab("metrics")} disabled={siteVisitRatingsMutation.isPending}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Metrics
                  </Button>
                </div>
                <div className="space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleSkipSiteVisit}
                    disabled={siteVisitRatingsMutation.isPending}
                  >
                    Skip Site Visit
                  </Button>
                  <Button type="submit" disabled={siteVisitRatingsMutation.isPending}>
                    {siteVisitRatingsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Finish Assessment <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </TooltipProvider>
  );
};

export default InputMetricValuesStep;
