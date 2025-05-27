
import React, { useEffect } from 'react';
import { Target as TargetIcon, PlusCircle, Trash2, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TargetMetricsFormData, TargetMetricsFormSchema, UserCustomMetricSetting, VISITOR_PROFILE_CATEGORY, MEASUREMENT_TYPES, PredefinedMetricCategory } from '@/types/targetMetrics';
import { predefinedMetricsConfig, PredefinedMetricConfig } from '@/config/targetMetricsConfig';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserCustomMetricSettings, saveUserCustomMetricSettings } from '@/services/targetMetricsService';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const TargetMetricsBuilderPage: React.FC = () => {
  const { user, authLoading } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<TargetMetricsFormData>({
    resolver: zodResolver(TargetMetricsFormSchema),
    defaultValues: {
      predefined_metrics: [],
      visitor_profile_metrics: [],
    },
  });

  const { fields: visitorProfileFields, append: appendVisitorProfile, remove: removeVisitorProfile } = useFieldArray({
    control: form.control,
    name: "visitor_profile_metrics",
  });

  const { data: existingSettings, isLoading: isLoadingSettings, error: fetchError } = useQuery({
    queryKey: ['userCustomMetricSettings', user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error('User not authenticated');
      return getUserCustomMetricSettings(user.id);
    },
    enabled: !!user && !authLoading,
  });

  useEffect(() => {
    if (existingSettings) {
      const predefinedMetricsData = predefinedMetricsConfig.map(config => {
        const existing = existingSettings.find(s => s.metric_identifier === config.metric_identifier);
        return {
          metric_identifier: config.metric_identifier,
          label: config.label,
          category: config.category,
          target_value: existing?.target_value ?? 0, // Default to 0 if not set
          higher_is_better: config.higher_is_better,
        };
      });

      const visitorProfileMetricsData = existingSettings
        .filter(s => s.category === VISITOR_PROFILE_CATEGORY)
        .map(s => ({
          metric_identifier: s.metric_identifier,
          label: s.label,
          category: VISITOR_PROFILE_CATEGORY,
          target_value: s.target_value,
          measurement_type: s.measurement_type as typeof MEASUREMENT_TYPES[number] | undefined, // cast as measurement_type can be null
          higher_is_better: s.higher_is_better,
        }));
      
      form.reset({
        predefined_metrics: predefinedMetricsData,
        visitor_profile_metrics: visitorProfileMetricsData,
      });
    } else if (!isLoadingSettings && !authLoading && user) { // If no existing settings, populate predefined with defaults
        const predefinedMetricsData = predefinedMetricsConfig.map(config => ({
            metric_identifier: config.metric_identifier,
            label: config.label,
            category: config.category,
            target_value: 0, // Default target
            higher_is_better: config.higher_is_better,
        }));
        form.reset({
            predefined_metrics: predefinedMetricsData,
            visitor_profile_metrics: [],
        });
    }
  }, [existingSettings, form, isLoadingSettings, authLoading, user]);

  const mutation = useMutation({
    mutationFn: (formData: TargetMetricsFormData) => {
      if (!user?.id) throw new Error('User not authenticated');
      return saveUserCustomMetricSettings(user.id, formData);
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "Target metrics saved successfully." });
      queryClient.invalidateQueries({ queryKey: ['userCustomMetricSettings', user?.id] });
    },
    onError: (error) => {
      toast({ title: "Error!", description: `Failed to save metrics: ${error.message}`, variant: "destructive" });
    },
  });

  const onSubmit = (data: TargetMetricsFormData) => {
    console.log("Form data submitted:", data);
    mutation.mutate(data);
  };

  if (authLoading || isLoadingSettings) {
    return <div className="container mx-auto py-12 px-4 text-center">Loading...</div>;
  }

  if (fetchError) {
    return <div className="container mx-auto py-12 px-4 text-center text-destructive">Error loading settings: {fetchError.message}</div>;
  }
  
  // Group predefined metrics by category for rendering
  const groupedPredefinedMetrics: Record<PredefinedMetricCategory, PredefinedMetricConfig[]> = 
    predefinedMetricsConfig.reduce((acc, metric) => {
      if (!acc[metric.category]) {
        acc[metric.category] = [];
      }
      acc[metric.category].push(metric);
      return acc;
    }, {} as Record<PredefinedMetricCategory, PredefinedMetricConfig[]>);


  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <TargetIcon size={48} className="text-primary mr-4" />
          <div>
            <h1 className="text-3xl font-bold text-primary">Target Metrics Builder</h1>
            <p className="text-muted-foreground">Define your custom target metrics for market analysis.</p>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link to="/target-selection">Back to Target Selection</Link>
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          {Object.entries(groupedPredefinedMetrics).map(([category, metricsInCategory], categoryIndex) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-xl">{category}</CardTitle>
                <CardDescription>Set your target values for {category.toLowerCase()} metrics.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {form.getValues().predefined_metrics.map((metric, index) => {
                   // Find the original config for description and to check category
                  const config = predefinedMetricsConfig.find(c => c.metric_identifier === metric.metric_identifier);
                  if (config?.category !== category) return null; // Only render metrics for the current category

                  return (
                    <FormField
                      key={metric.metric_identifier}
                      control={form.control}
                      name={`predefined_metrics.${index}.target_value`}
                      render={({ field }) => (
                        <FormItem className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-md">
                          <div className="sm:w-2/5 mb-2 sm:mb-0">
                            <FormLabel className="text-base">{metric.label}</FormLabel>
                            {config?.description && <FormDescription>{config.description}</FormDescription>}
                            <FormDescription>
                              {metric.higher_is_better ? "(Higher is better)" : "(Lower is better)"}
                            </FormDescription>
                          </div>
                          <div className="sm:w-2/5">
                            <FormControl>
                              <Input type="number" placeholder="Enter target value" {...field} />
                            </FormControl>
                          </div>
                           <div className="sm:w-1/5 min-h-[20px] mt-1 sm:mt-0"> <FormMessage /></div>
                        </FormItem>
                      )}
                    />
                  );
                })}
              </CardContent>
            </Card>
          ))}

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
                          <FormControl><Input type="number" placeholder="Enter value" {...field} /></FormControl>
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
                          <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
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
                    {/* Hidden field for metric_identifier, useful if editing existing ones */}
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
                  metric_identifier: `new_visitor_metric_${Date.now()}`, // Temporary unique ID for new item
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
              <Link to="/target-selection">Cancel</Link>
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {mutation.isPending ? 'Saving...' : 'Save Metrics'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default TargetMetricsBuilderPage;

