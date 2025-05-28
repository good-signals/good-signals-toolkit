import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Target as TargetIcon, PlusCircle, Trash2, Save, Edit3, List, Info, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TargetMetricsFormData, TargetMetricsFormSchema, UserCustomMetricSetting, VISITOR_PROFILE_CATEGORY, MEASUREMENT_TYPES, PredefinedMetricCategory, TargetMetricSet, AccountCustomMetric, CreateCustomMetricFormData } from '@/types/targetMetrics';
import { predefinedMetricsConfig as initialPredefinedMetricsConfig, PredefinedMetricConfig } from '@/config/targetMetricsConfig';
import { metricDropdownOptions, specificDropdownMetrics } from '@/config/metricDisplayConfig';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getUserCustomMetricSettings, 
  saveUserCustomMetricSettings,
  createTargetMetricSet,
  updateTargetMetricSetName,
  getTargetMetricSetById,
} from '@/services/targetMetricsService';
import { 
  getAccountCustomMetrics,
  createAccountCustomMetric,
} from '@/services/accountCustomMetricsService';
import { toast as sonnerToast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import CustomMetricForm from '@/components/target-metrics/CustomMetricForm';

const NON_EDITABLE_PREDEFINED_METRICS = [
  'market_saturation_trade_area_overlap',
  'market_saturation_heat_map_intersection',
  'demand_supply_balance'
];

const TargetMetricsBuilderPage: React.FC = () => {
  const { user, authLoading } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const { metricSetId: routeMetricSetId } = useParams<{ metricSetId?: string }>();
  const [currentMetricSetId, setCurrentMetricSetId] = useState<string | undefined>(routeMetricSetId);
  const [customMetricFormOpen, setCustomMetricFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    setCurrentMetricSetId(routeMetricSetId);
  }, [routeMetricSetId]);

  const form = useForm<TargetMetricsFormData>({
    resolver: zodResolver(TargetMetricsFormSchema),
    defaultValues: {
      metric_set_id: routeMetricSetId, 
      metric_set_name: "", 
      predefined_metrics: initialPredefinedMetricsConfig.map(config => {
        let targetValue;
        if (NON_EDITABLE_PREDEFINED_METRICS.includes(config.metric_identifier)) {
          targetValue = metricDropdownOptions[config.metric_identifier]?.find(opt => opt.label.includes("No Overlap") || opt.label.includes("Cold Spot") || opt.label.includes("Positive Demand"))?.value ?? 50;
        } else if (specificDropdownMetrics.includes(config.metric_identifier)) {
          targetValue = 50;
        } else {
          targetValue = 0;
        }
        return {
          metric_identifier: config.metric_identifier,
          label: config.label,
          category: config.category,
          target_value: targetValue,
          higher_is_better: config.higher_is_better,
        };
      }),
      custom_metrics: [],
      visitor_profile_metrics: [],
    },
  });

  const { fields: visitorProfileFields, append: appendVisitorProfile, remove: removeVisitorProfile } = useFieldArray({
    control: form.control,
    name: "visitor_profile_metrics",
  });

  const { fields: customMetricsFields, append: appendCustomMetric, remove: removeCustomMetric } = useFieldArray({
    control: form.control,
    name: "custom_metrics",
  });

  // Query for account custom metrics
  const { data: accountCustomMetrics, isLoading: isLoadingCustomMetrics } = useQuery({
    queryKey: ['accountCustomMetrics', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return getAccountCustomMetrics(user.id);
    },
    enabled: !!user && !authLoading,
  });

  const { data: existingMetricSet, isLoading: isLoadingMetricSet } = useQuery({
    queryKey: ['targetMetricSet', currentMetricSetId, user?.id],
    queryFn: async () => {
      if (!user?.id || !currentMetricSetId) return null;
      return getTargetMetricSetById(currentMetricSetId, user.id);
    },
    enabled: !!user && !!currentMetricSetId && !authLoading,
  });

  const { data: existingMetrics, isLoading: isLoadingMetrics, error: fetchError } = useQuery({
    queryKey: ['userCustomMetricSettings', currentMetricSetId, user?.id],
    queryFn: () => {
      if (!user?.id || !currentMetricSetId) return [];
      return getUserCustomMetricSettings(currentMetricSetId);
    },
    enabled: !!user && !!currentMetricSetId && !authLoading,
  });

  // Mutation for creating custom metrics
  const createCustomMetricMutation = useMutation({
    mutationFn: async (metricData: CreateCustomMetricFormData) => {
      if (!user?.id) throw new Error('User not authenticated');
      return createAccountCustomMetric(user.id, metricData);
    },
    onSuccess: (newMetric) => {
      sonnerToast.success("Custom metric created successfully!");
      queryClient.invalidateQueries({ queryKey: ['accountCustomMetrics', user?.id] });
      
      // Add the new custom metric to the form with default target value
      const newCustomMetricFormData = {
        metric_identifier: newMetric.metric_identifier,
        label: newMetric.name,
        category: newMetric.category,
        target_value: newMetric.default_target_value || 0,
        higher_is_better: newMetric.higher_is_better,
        units: newMetric.units || undefined,
        is_custom: true as const,
      };
      appendCustomMetric(newCustomMetricFormData);
      setCustomMetricFormOpen(false);
    },
    onError: (error) => {
      sonnerToast.error(`Failed to create custom metric: ${error.message}`);
    },
  });

  useEffect(() => {
    if (currentMetricSetId && existingMetricSet && existingMetrics && accountCustomMetrics) {
      const predefinedMetricsData = initialPredefinedMetricsConfig.map(config => {
        const existing = existingMetrics.find(s => s.metric_identifier === config.metric_identifier);
        let targetValue;

        if (NON_EDITABLE_PREDEFINED_METRICS.includes(config.metric_identifier)) {
           targetValue = metricDropdownOptions[config.metric_identifier]?.find(opt => opt.label.includes("No Overlap") || opt.label.includes("Cold Spot") || opt.label.includes("Positive Demand"))?.value ?? 
                         existing?.target_value ?? 
                         50;
        } else if (existing) {
          targetValue = existing.target_value;
        } else if (specificDropdownMetrics.includes(config.metric_identifier)) {
          targetValue = 50;
        } else {
          targetValue = 0;
        }
        return {
          metric_identifier: config.metric_identifier,
          label: config.label,
          category: config.category,
          target_value: targetValue,
          higher_is_better: existing?.higher_is_better ?? config.higher_is_better,
        };
      });

      // Handle custom metrics from account custom metrics
      const customMetricsData = accountCustomMetrics
        .filter(customMetric => customMetric.category !== VISITOR_PROFILE_CATEGORY)
        .map(customMetric => {
          const existing = existingMetrics.find(s => s.metric_identifier === customMetric.metric_identifier);
          return {
            metric_identifier: customMetric.metric_identifier,
            label: customMetric.name,
            category: customMetric.category,
            target_value: existing?.target_value ?? customMetric.default_target_value ?? 0,
            higher_is_better: existing?.higher_is_better ?? customMetric.higher_is_better,
            units: customMetric.units || undefined,
            is_custom: true as const,
          };
        });

      const visitorProfileMetricsData = existingMetrics
        .filter(s => s.category === VISITOR_PROFILE_CATEGORY)
        .map(s => ({
          metric_identifier: s.metric_identifier,
          label: s.label,
          category: VISITOR_PROFILE_CATEGORY, 
          target_value: s.target_value,
          measurement_type: s.measurement_type as typeof MEASUREMENT_TYPES[number] | undefined,
          higher_is_better: s.higher_is_better,
        }));
      
      form.reset({
        metric_set_id: existingMetricSet.id,
        metric_set_name: existingMetricSet.name,
        predefined_metrics: predefinedMetricsData,
        custom_metrics: customMetricsData,
        visitor_profile_metrics: visitorProfileMetricsData,
      });
    } else if (!currentMetricSetId && !isLoadingMetricSet && !isLoadingMetrics && !authLoading && user && accountCustomMetrics) {
      // Initialize custom metrics for new metric set
      const customMetricsData = accountCustomMetrics
        .filter(customMetric => customMetric.category !== VISITOR_PROFILE_CATEGORY)
        .map(customMetric => ({
          metric_identifier: customMetric.metric_identifier,
          label: customMetric.name,
          category: customMetric.category,
          target_value: customMetric.default_target_value ?? 0,
          higher_is_better: customMetric.higher_is_better,
          units: customMetric.units || undefined,
          is_custom: true as const,
        }));

      form.reset({
        ...form.formState.defaultValues,
        custom_metrics: customMetricsData,
      });
    }
  }, [currentMetricSetId, existingMetricSet, existingMetrics, accountCustomMetrics, form, isLoadingMetricSet, isLoadingMetrics, authLoading, user]);

  const mutation = useMutation({
    mutationFn: async (formData: TargetMetricsFormData) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      let operatingMetricSetId = formData.metric_set_id || currentMetricSetId;

      if (!formData.metric_set_name || formData.metric_set_name.trim() === "") {
        throw new Error("Metric set name is required.");
      }

      if (operatingMetricSetId) {
        await updateTargetMetricSetName(operatingMetricSetId, user.id, formData.metric_set_name);
      } else {
        const newSet = await createTargetMetricSet(user.id, formData.metric_set_name);
        operatingMetricSetId = newSet.id;
        setCurrentMetricSetId(newSet.id); 
        form.setValue('metric_set_id', newSet.id); 
        navigate(`/target-metrics-builder/${newSet.id}`, { replace: true });
      }

      if (!operatingMetricSetId) {
        throw new Error("Failed to get or create metric set ID.");
      }
      
      const mutableFormData = {
        ...formData,
        predefined_metrics: formData.predefined_metrics.filter(
          metric => !NON_EDITABLE_PREDEFINED_METRICS.includes(metric.metric_identifier)
        ),
      };

      return saveUserCustomMetricSettings(user.id, operatingMetricSetId, mutableFormData);
    },
    onSuccess: (data, variables) => { 
      sonnerToast.success("Target metrics saved successfully!");
      const finalMetricSetId = variables.metric_set_id || currentMetricSetId;
      queryClient.invalidateQueries({ queryKey: ['userCustomMetricSettings', finalMetricSetId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['targetMetricSet', finalMetricSetId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['targetMetricSets', user?.id] });
    },
    onError: (error) => {
      sonnerToast.error(`Failed to save metrics: ${error.message}`);
    },
  });

  const onSubmit = (data: TargetMetricsFormData) => {
    console.log("Form data submitted:", data);
    mutation.mutate(data);
  };

  const handleAddCustomMetric = () => {
    setCustomMetricFormOpen(true);
  };

  const handleCustomMetricSubmit = (data: CreateCustomMetricFormData) => {
    createCustomMetricMutation.mutate(data);
  };

  if (authLoading || isLoadingMetricSet || isLoadingCustomMetrics || (currentMetricSetId && isLoadingMetrics)) {
    return <div className="container mx-auto py-12 px-4 text-center">Loading...</div>;
  }

  if (fetchError) {
    return <div className="container mx-auto py-12 px-4 text-center text-destructive">Error loading settings: {fetchError.message}</div>;
  }
  
  const groupedPredefinedMetrics: Record<PredefinedMetricCategory, PredefinedMetricConfig[]> = 
    initialPredefinedMetricsConfig.reduce((acc, metric) => {
      const category = metric.category as PredefinedMetricCategory;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(metric);
      return acc;
    }, {} as Record<PredefinedMetricCategory, PredefinedMetricConfig[]>);

  // Group custom metrics by category
  const groupedCustomMetrics = customMetricsFields.reduce((acc, metric, index) => {
    const category = metric.category as PredefinedMetricCategory;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({ ...metric, index });
    return acc;
  }, {} as Record<PredefinedMetricCategory, Array<(typeof customMetricsFields[0] & { index: number })>>);

  return (
    <TooltipProvider>
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <TargetIcon size={48} className="text-primary mr-4" />
          <div>
            <h1 className="text-3xl font-bold text-primary">Target Metrics Builder</h1>
            <p className="text-muted-foreground">
              {currentMetricSetId ? "Edit your target metrics set." : "Define a new custom target metrics set."}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleAddCustomMetric}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Custom Metric
          </Button>
          <Button asChild variant="outline">
            <Link to="/target-metric-sets"><List className="mr-2"/> View All Sets</Link>
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Metric Set Details</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="metric_set_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Metric Set Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., My Q3 Retail Targets" {...field} />
                    </FormControl>
                    <FormDescription>Give a descriptive name to this set of metrics.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          {Object.entries(groupedPredefinedMetrics).map(([category, metricsInCategory]) => {
            const customMetricsInCategory = groupedCustomMetrics[category as PredefinedMetricCategory] || [];
            
            return (
              <Card key={category}>
                <CardHeader>
                  <div>
                    <CardTitle className="text-xl">{category}</CardTitle>
                    <CardDescription>Set your target values for {category.toLowerCase()} metrics.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Predefined Metrics */}
                  {form.getValues().predefined_metrics.map((metric, index) => {
                    const config = initialPredefinedMetricsConfig.find(c => c.metric_identifier === metric.metric_identifier);
                    if (config?.category !== category) return null;

                    const isNonEditable = NON_EDITABLE_PREDEFINED_METRICS.includes(metric.metric_identifier);

                    return (
                      <FormField
                        key={`${metric.metric_identifier}-${index}-predefined`}
                        control={form.control}
                        name={`predefined_metrics.${index}.target_value`}
                        render={({ field }) => (
                          <FormItem className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-md">
                            <div className="sm:w-2/5 mb-2 sm:mb-0">
                              <FormLabel className="text-base">{metric.label}</FormLabel>
                              {config?.description && <FormDescription>{config.description}</FormDescription>}
                              <FormDescription>
                                {(form.getValues().predefined_metrics[index]?.higher_is_better ?? config?.higher_is_better) ? "(Higher is better)" : "(Lower is better)"}
                                {isNonEditable && (
                                  <Tooltip delayDuration={100}>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 ml-1.5 text-muted-foreground inline-block" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">
                                      <p>This metric's target and scoring are predefined based on dropdown selection in assessments.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </FormDescription>
                            </div>
                            <div className="sm:w-2/5">
                              {specificDropdownMetrics.includes(metric.metric_identifier) ? (
                                <Select
                                  onValueChange={(value) => {
                                    if (!isNonEditable) field.onChange(parseFloat(value));
                                  }}
                                  value={String(field.value)}
                                  defaultValue={String(field.value)}
                                  disabled={isNonEditable}
                                >
                                  <SelectTrigger className={isNonEditable ? "bg-muted/50 cursor-not-allowed" : ""}>
                                    <SelectValue placeholder={isNonEditable ? "Predefined Target" : "Select target"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {metricDropdownOptions[metric.metric_identifier].map(option => (
                                      <SelectItem key={option.value} value={String(option.value)}>
                                        {option.label} ({option.value})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder={isNonEditable ? "Predefined Target" : "Enter target value"} 
                                    {...field} 
                                    onChange={e => {
                                      if (!isNonEditable) field.onChange(parseFloat(e.target.value) || 0);
                                    }} 
                                    readOnly={isNonEditable}
                                    className={isNonEditable ? "bg-muted/50" : ""}
                                  />
                                </FormControl>
                              )}
                            </div>
                            <div className="sm:w-1/5 min-h-[20px] mt-1 sm:mt-0"> <FormMessage /></div>
                          </FormItem>
                        )}
                      />
                    );
                  })}

                  {/* Custom Metrics */}
                  {customMetricsInCategory.map((customMetric) => (
                    <FormField
                      key={`${customMetric.metric_identifier}-${customMetric.index}-custom`}
                      control={form.control}
                      name={`custom_metrics.${customMetric.index}.target_value`}
                      render={({ field }) => (
                        <FormItem className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-md bg-blue-50/50">
                          <div className="sm:w-2/5 mb-2 sm:mb-0">
                            <div className="flex items-center gap-2">
                              <FormLabel className="text-base">{customMetric.label}</FormLabel>
                              <Badge variant="secondary" className="text-xs">Custom</Badge>
                            </div>
                            {customMetric.units && (
                              <FormDescription>Units: {customMetric.units}</FormDescription>
                            )}
                            <FormDescription>
                              {customMetric.higher_is_better ? "(Higher is better)" : "(Lower is better)"}
                            </FormDescription>
                          </div>
                          <div className="sm:w-2/5">
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Enter target value" 
                                {...field} 
                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)} 
                              />
                            </FormControl>
                          </div>
                          <div className="sm:w-1/5 flex items-center justify-end gap-2">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon"
                              onClick={() => removeCustomMetric(customMetric.index)}
                              className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  ))}
                </CardContent>
              </Card>
            );
          })}

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{VISITOR_PROFILE_CATEGORY}</CardTitle>
              <CardDescription>Define custom attributes for visitor profiles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {visitorProfileFields.map((item, index) => (
                <Card key={item.id} className="p-4 relative">
                   <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeVisitorProfile(index)}
                      className="absolute top-2 right-2 text-destructive hover:text-destructive-foreground hover:bg-destructive/10"
                      aria-label="Remove visitor profile metric"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                    <FormField
                      control={form.control}
                      name={`visitor_profile_metrics.${index}.label`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Attribute Name</FormLabel>
                          <FormControl><Input placeholder="e.g., Income Level" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`visitor_profile_metrics.${index}.target_value`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Value</FormLabel>
                          <FormControl><Input type="number" placeholder="Enter value" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name={`visitor_profile_metrics.${index}.measurement_type`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Measurement Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? undefined} defaultValue={field.value ?? undefined}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {MEASUREMENT_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`visitor_profile_metrics.${index}.higher_is_better`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 pt-7">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel>Higher value is better?</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Controller
                        name={`visitor_profile_metrics.${index}.metric_identifier`}
                        control={form.control}
                        render={({ field }) => <input type="hidden" {...field} />}
                    />
                     <Controller
                        name={`visitor_profile_metrics.${index}.category`}
                        control={form.control}
                        defaultValue={VISITOR_PROFILE_CATEGORY}
                        render={({ field }) => <input type="hidden" {...field} />}
                    />
                  </div>
                </Card>
              ))}
              <Button type="button" variant="outline" onClick={() => appendVisitorProfile({ 
                  metric_identifier: `new_visitor_metric_${Date.now()}`, 
                  label: "", 
                  category: VISITOR_PROFILE_CATEGORY, 
                  target_value: 0, 
                  measurement_type: "Index", 
                  higher_is_better: true 
                })} className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Visitor Attribute
              </Button>
            </CardContent>
          </Card>
          
          <Separator />

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="ghost" asChild>
              <Link to="/target-metric-sets">Cancel</Link>
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {mutation.isPending ? 'Saving...' : (currentMetricSetId || form.getValues().metric_set_id ? 'Update Metric Set' : 'Save New Metric Set')}
            </Button>
          </div>
        </form>
      </Form>

      <CustomMetricForm
        open={customMetricFormOpen}
        onOpenChange={setCustomMetricFormOpen}
        onSubmit={handleCustomMetricSubmit}
        isLoading={createCustomMetricMutation.isPending}
      />
    </div>
    </TooltipProvider>
  );
};

export default TargetMetricsBuilderPage;
