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
import { Loader2, ArrowRight, ArrowLeft, Info, Save } from 'lucide-react';
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

const siteVisitRatingItemSchema = z.object({
  criterion_key: z.string(), // Using z.string() for simplicity, matching SiteVisitCriterionKey type
  grade: z.string().optional(), // Empty string means "No Grade"
  notes: z.string().optional().nullable(),
});

const formSchema = z.object({
  metrics: z.array(metricValueSchema),
  siteVisitRatings: z.array(siteVisitRatingItemSchema),
});

type MetricValuesFormData = z.infer<typeof formSchema>;

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
  
  const { data: existingSiteVisitRatings, isLoading: isLoadingSiteVisitRatings } = useQuery({
    queryKey: ['siteVisitRatings', assessmentId],
    queryFn: () => getSiteVisitRatings(assessmentId),
    enabled: !!assessmentId,
  });
  
  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MetricValuesFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { metrics: [], siteVisitRatings: [] },
  });

  const { fields: metricFields, replace: replaceMetrics } = useFieldArray({
    control,
    name: "metrics",
  });

  const { fields: siteVisitRatingFields, replace: replaceSiteVisitRatings } = useFieldArray({
    control,
    name: "siteVisitRatings",
  });

  // Initialize form data
  useEffect(() => {
    if (metricSet?.user_custom_metrics_settings) {
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
        };
      });
      replaceMetrics(initialMetrics);
    } else if (metricSet && metricSet.user_custom_metrics_settings?.length === 0) {
      replaceMetrics([]);
    }

    if (siteVisitCriteria) { 
        const initialSiteVisitRatingsData = siteVisitCriteria.map(criterion => {
            const existingRating = existingSiteVisitRatings?.find(r => r.criterion_key === criterion.key);
            return {
                criterion_key: criterion.key,
                // Ensure form state for grade is '' if no grade or "none" was stored.
                grade: (existingRating?.rating_grade && existingRating.rating_grade !== 'none') ? existingRating.rating_grade : '', 
                notes: existingRating?.notes || '',
            };
        });
        replaceSiteVisitRatings(initialSiteVisitRatingsData);
    }

  }, [metricSet, existingMetricValues, existingSiteVisitRatings, replaceMetrics, replaceSiteVisitRatings]);

  const metricsMutation = useMutation({
    mutationFn: (data: AssessmentMetricValueInsert[]) => {
        if (!user?.id) throw new Error('User not authenticated');
        return saveAssessmentMetricValues(assessmentId, data);
    },
    onError: (error: Error) => {
      toast({ title: "Error Saving Metrics", description: `Failed to save metric values: ${error.message}`, variant: "destructive" });
    },
  });

  const siteVisitRatingsMutation = useMutation({
    mutationFn: (ratingsToSave: AssessmentSiteVisitRatingInsert[]) => saveSiteVisitRatings(assessmentId, ratingsToSave),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Site visit ratings saved successfully.' });
      queryClient.invalidateQueries({ queryKey: ['siteVisitRatings', assessmentId] });
      onMetricsSubmitted(assessmentId); 
    },
    onError: (error: Error) => {
      toast({ title: 'Error Saving Site Visit Ratings', description: `Failed to save ratings: ${error.message}`, variant: 'destructive' });
    },
  });

  const onSubmitCombinedData: SubmitHandler<MetricValuesFormData> = async (data) => {
    console.log("Form data submitted:", data);
    const metricsToSave: AssessmentMetricValueInsert[] = data.metrics.map(m => ({
      assessment_id: assessmentId,
      metric_identifier: m.metric_identifier,
      label: m.label, 
      category: m.category, 
      entered_value: m.entered_value, 
      measurement_type: m.measurement_type,
      notes: m.notes,
    }));

    const ratingsToSave: AssessmentSiteVisitRatingInsert[] = data.siteVisitRatings
      .map(svr => {
        const criterion = siteVisitCriteria.find(c => c.key === svr.criterion_key);
        if (!criterion) return null; 
        
        // svr.grade will be '' if "No Grade" was selected (due to onValueChange logic)
        // or if it was initialized as such.
        if (svr.grade && svr.grade !== '') { 
          const gradeDetail = criterion.grades.find(g => g.grade === svr.grade);
          return {
            assessment_id: assessmentId,
            criterion_key: svr.criterion_key as SiteVisitCriterionKey,
            rating_grade: svr.grade as SiteVisitRatingGrade,
            rating_description: gradeDetail?.description || '',
            notes: svr.notes || null,
          };
        }
        return null;
      })
      .filter(Boolean) as AssessmentSiteVisitRatingInsert[];

    console.log("Metrics to save:", metricsToSave);
    console.log("Ratings to save:", ratingsToSave);

    let metricsStepSuccess = false;
    if (metricsToSave.length > 0 || metricFields.length > 0) { 
      try {
        if (metricsToSave.length > 0) {
          await metricsMutation.mutateAsync(metricsToSave);
          toast({ title: "Metrics Saved", description: "Metric values have been successfully saved." });
        } else {
          toast({ title: "Metrics", description: "No new metric values to save." });
        }
        queryClient.invalidateQueries({ queryKey: ['assessmentMetricValues', assessmentId] });
        metricsStepSuccess = true;
      } catch (error) {
        // Error already toasted by mutation's onError.
        return;
      }
    } else {
      // No metrics configured at all.
      metricsStepSuccess = true;
    }

    if (metricsStepSuccess) {
      if (ratingsToSave.length > 0 || siteVisitRatingFields.length > 0) { 
        if (ratingsToSave.length > 0) {
          siteVisitRatingsMutation.mutate(ratingsToSave);
        } else {
          // No ratings to save, but fields exist. Proceed to next step directly.
          toast({ title: 'Site Visit Ratings', description: 'No new site visit ratings to save.' });
          onMetricsSubmitted(assessmentId);
        }
      } else {
        // No site visit ratings configured at all.
        onMetricsSubmitted(assessmentId);
      }
    }
  };
  
  const metricsByCategory = metricFields.reduce((acc, field, index) => {
    const typedField = field as unknown as UserCustomMetricSetting & { id: string; entered_value: number; notes?: string | null }; // Cast for target_value etc.
    // Find the original metric definition to get target_value, higher_is_better
    const originalMetricDef = metricSet?.user_custom_metrics_settings.find(m => m.metric_identifier === typedField.metric_identifier);

    const category = typedField.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({ 
        ...typedField, 
        originalIndex: index,
        target_value: originalMetricDef?.target_value,
        higher_is_better: originalMetricDef?.higher_is_better
    });
    return acc;
  }, {} as Record<string, Array<UserCustomMetricSetting & { id: string; originalIndex: number; entered_value: number; notes?: string | null }>>);

  const getCriterionDetails = (key: SiteVisitCriterionKey) => {
    return siteVisitCriteria.find(c => c.key === key);
  };

  if (isLoadingMetricSet || isLoadingExistingValues || isLoadingSiteVisitRatings) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading data...</p></div>;
  }

  if (metricSetError) {
    return <p className="text-destructive text-center p-4">Error loading metric set: {metricSetError.message}</p>;
  }
  
  return (
    <TooltipProvider>
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Step 3: Input Data for "{metricSet?.name || 'Assessment'}"</CardTitle>
          <CardDescription>
            Enter metric values and site visit ratings for your assessment. Assessment ID: {assessmentId}
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit(onSubmitCombinedData)}>
          <CardContent className="space-y-8 pt-4">
            {(metricSet && metricSet.user_custom_metrics_settings && metricSet.user_custom_metrics_settings.length > 0) || siteVisitRatingFields.length > 0 ? (
              <>
                {metricSet && metricSet.user_custom_metrics_settings && metricSet.user_custom_metrics_settings.length > 0 ? (
                  Object.entries(metricsByCategory).map(([category, categoryMetrics]) => (
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
                                    <p>Target: {metricField.target_value ?? 'N/A'} ({metricField.higher_is_better ? "Higher is better" : "Lower is better"})</p>
                                    {metricField.measurement_type && <p>Type: {metricField.measurement_type}</p>}
                                  </TooltipContent>
                                </Tooltip>
                              </Label>
                              
                              {specificDropdownMetrics.includes(metricField.metric_identifier) ? (
                                <Controller
                                  name={`metrics.${metricField.originalIndex}.entered_value`}
                                  control={control}
                                  render={({ field: controllerField }) => (
                                    <Select
                                      value={controllerField.value !== null && controllerField.value !== undefined ? String(controllerField.value) : ""}
                                      onValueChange={(value) => controllerField.onChange(parseFloat(value))}
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
                                  render={({ field: controllerField }) => (
                                    <Input
                                      {...controllerField}
                                      id={`metrics.${metricField.originalIndex}.entered_value`}
                                      type="number"
                                      step="any"
                                      placeholder={`Enter value for ${metricField.label}`}
                                      className="mt-1"
                                      value={controllerField.value === null || controllerField.value === undefined ? '' : String(controllerField.value)}
                                      onChange={e => controllerField.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
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
                                render={({ field: controllerField }) => (
                                  <Textarea
                                    {...controllerField}
                                    id={`metrics.${metricField.originalIndex}.notes`}
                                    placeholder="Any specific observations or context..."
                                    className="mt-1"
                                    value={controllerField.value ?? ''}
                                    onChange={e => controllerField.onChange(e.target.value)}
                                  />
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                ): (
                  metricSet && metricSet.user_custom_metrics_settings && metricSet.user_custom_metrics_settings.length === 0 && siteVisitRatingFields.length > 0 && (
                     <CardDescription>
                        No custom metrics are defined for the Target Metric Set: "{metricSet?.name || 'Unknown'}". 
                        You can still provide Site Visit Ratings below.
                    </CardDescription>
                  )
                )}

                {/* Site Visit Ratings Section */}
                {siteVisitRatingFields.length > 0 && (
                  <div className="space-y-6 border-t pt-6 mt-8">
                    <h3 className="text-lg font-semibold text-primary">Site Visit Ratings</h3>
                    {siteVisitRatingFields.map((field, index) => {
                      const criterionDetails = getCriterionDetails(field.criterion_key as SiteVisitCriterionKey);
                      if (!criterionDetails) return null; 

                      return (
                        <div key={field.id} className="p-4 border rounded-md shadow-sm bg-card">
                          <h4 className="text-md font-semibold mb-1">{criterionDetails.label}</h4>
                          <p className="text-sm text-muted-foreground mb-3">{criterionDetails.description}</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                            <div className="md:col-span-1">
                              <Label htmlFor={`siteVisitRatings.${index}.grade`}>Grade</Label>
                              <Controller
                                name={`siteVisitRatings.${index}.grade`}
                                control={control}
                                render={({ field: controllerField }) => (
                                  <Select
                                    // controllerField.value is '' for "No Grade" or unselected.
                                    // This makes Select show placeholder if controllerField.value is ''.
                                    value={controllerField.value || ''} 
                                    onValueChange={(value) => {
                                      // If 'none' is selected from dropdown, set form state to ''.
                                      // Otherwise, set to the selected grade value.
                                      controllerField.onChange(value === 'none' ? '' : value);
                                    }}
                                  >
                                    <SelectTrigger id={`siteVisitRatings.${index}.grade`} className="mt-1">
                                      <SelectValue placeholder="Select grade" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {/* Ensure "No Grade" item has a non-empty value */}
                                      <SelectItem value="none"><em>No Grade</em></SelectItem>
                                      {criterionDetails.grades.map(grade => (
                                        <SelectItem key={grade.grade} value={grade.grade}>
                                          {grade.grade} - {grade.description}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <Label htmlFor={`siteVisitRatings.${index}.notes`}>Notes (Optional)</Label>
                              <Controller
                                name={`siteVisitRatings.${index}.notes`}
                                control={control}
                                render={({ field: controllerField }) => (
                                  <Textarea
                                    {...controllerField}
                                    id={`siteVisitRatings.${index}.notes`}
                                    placeholder="Optional notes..."
                                    rows={2}
                                    className="mt-1"
                                    value={controllerField.value ?? ''}
                                  />
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <CardDescription>
                Neither custom metrics nor site visit criteria are available for this assessment. 
                Please configure a Target Metric Set or check system settings.
              </CardDescription>
            )}
          </CardContent>
          <CardFooter className="flex justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 border-t sticky bottom-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onBack} 
              disabled={isSubmitting || metricsMutation.isPending || siteVisitRatingsMutation.isPending}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || metricsMutation.isPending || siteVisitRatingsMutation.isPending}
            >
              {(isSubmitting || metricsMutation.isPending || siteVisitRatingsMutation.isPending) ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Finish Assessment
            </Button>
          </CardFooter>
        </form>
      </Card>
    </TooltipProvider>
  );
};

export default InputMetricValuesStep;
