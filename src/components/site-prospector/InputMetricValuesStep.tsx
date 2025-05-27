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
import { saveAssessmentMetricValues, getAssessmentMetricValues } from '@/services/siteAssessmentService';
import { TargetMetricSet, UserCustomMetricSetting } from '@/types/targetMetrics';
import { AssessmentMetricValueInsert } from '@/types/siteAssessmentTypes';
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

const formSchema = z.object({
  metrics: z.array(metricValueSchema),
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
  
  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MetricValuesFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { metrics: [] },
  });

  const { fields, append, replace } = useFieldArray({
    control,
    name: "metrics",
  });

  useEffect(() => {
    if (metricSet?.user_custom_metrics_settings && metricSet.user_custom_metrics_settings.length > 0) {
      const initialMetrics = metricSet.user_custom_metrics_settings.map(metric => {
        const existingValue = existingMetricValues?.find(ev => ev.metric_identifier === metric.metric_identifier);
        
        let defaultValue: number;
        if (existingValue?.entered_value !== undefined && existingValue?.entered_value !== null) {
          defaultValue = existingValue.entered_value;
        } else if (specificDropdownMetrics.includes(metric.metric_identifier)) {
          // Default to the middle option (50) for new dropdowns if no existing value
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


  const mutation = useMutation({
    mutationFn: (data: AssessmentMetricValueInsert[]) => {
        if (!user?.id) throw new Error('User not authenticated');
        return saveAssessmentMetricValues(assessmentId, data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Metric values saved." });
      queryClient.invalidateQueries({ queryKey: ['assessmentMetricValues', assessmentId] });
      onMetricsSubmitted(assessmentId);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `Failed to save metric values: ${error.message}`, variant: "destructive" });
    },
  });

  const onSubmit: SubmitHandler<MetricValuesFormData> = (data) => {
    const payload: AssessmentMetricValueInsert[] = data.metrics.map(m => ({
      assessment_id: assessmentId,
      metric_identifier: m.metric_identifier,
      label: m.label,
      category: m.category,
      entered_value: m.entered_value,
      measurement_type: m.measurement_type,
      notes: m.notes,
    }));
    mutation.mutate(payload);
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


  if (isLoadingMetricSet || isLoadingExistingValues) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading metrics...</p></div>;
  }

  if (metricSetError) {
    return <p className="text-destructive text-center p-4">Error loading metric set: {metricSetError.message}</p>;
  }

  if (!metricSet || !metricSet.user_custom_metrics_settings || metricSet.user_custom_metrics_settings.length === 0) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Step 3: Input Metric Values</CardTitle>
        </CardHeader>
        <CardContent>
          <p>The selected Target Metric Set ({metricSet?.name || 'Unknown'}) has no custom metrics defined.</p>
          <p className="mt-2">You can proceed or go back to select a different metric set or add metrics to this one.</p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
          <Button type="button" onClick={() => onMetricsSubmitted(assessmentId)}>Finish Assessment <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <TooltipProvider>
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Step 3: Input Metric Values for "{metricSet.name}"</CardTitle>
          <CardDescription>
            Enter the actual values for each metric based on your site assessment. Target values are shown for reference.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-8">
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
          <CardFooter className="flex justify-between sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 border-t">
            <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Finish Assessment <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </form>
      </Card>
    </TooltipProvider>
  );
};

export default InputMetricValuesStep;
