
import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Target as TargetIcon, PlusCircle, Trash2, Save, List, Info, Plus, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { VISITOR_PROFILE_CATEGORY, MEASUREMENT_TYPES, PredefinedMetricCategory, OPTIONAL_METRIC_CATEGORIES } from '@/types/targetMetrics';
import { predefinedMetricsConfig as initialPredefinedMetricsConfig, PredefinedMetricConfig, getEnabledCategories } from '@/config/targetMetricsConfig';
import { metricDropdownOptions, specificDropdownMetrics } from '@/config/metricDisplayConfig';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getStandardMetricSets,
  getStandardMetricSetWithSettings,
  createStandardMetricSet,
  updateStandardMetricSetName,
  saveStandardMetricSettings
} from '@/services/standardMetricsService';
import { toast as sonnerToast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { StandardMetricsFormData } from '@/types/standardMetrics';
import { useStandardMetricsDraft } from '@/hooks/useStandardMetricsDraft';
import PredefinedMetricsSection from '@/components/target-metrics/PredefinedMetricsSection';

const StandardMetricsFormSchema = z.object({
  metric_set_id: z.string().optional(),
  metric_set_name: z.string().min(1, "Metric set name is required"),
  metric_set_description: z.string().optional(),
  enabled_optional_sections: z.array(z.string()),
  predefined_metrics: z.array(z.object({
    metric_identifier: z.string(),
    label: z.string(),
    category: z.string(),
    target_value: z.number(),
    higher_is_better: z.boolean(),
  })),
  custom_metrics: z.array(z.object({
    metric_identifier: z.string(),
    label: z.string(),
    category: z.string(),
    target_value: z.number(),
    higher_is_better: z.boolean(),
    units: z.string().optional(),
    is_custom: z.literal(true),
  })),
  visitor_profile_metrics: z.array(z.object({
    metric_identifier: z.string(),
    label: z.string(),
    category: z.string(),
    target_value: z.number(),
    measurement_type: z.string().optional(),
    higher_is_better: z.boolean(),
  })),
});

const StandardMetricsBuilderPage: React.FC = () => {
  const { isSuperAdmin } = useSuperAdmin();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const { metricSetId: routeMetricSetId } = useParams<{ metricSetId?: string }>();
  const [currentMetricSetId, setCurrentMetricSetId] = useState<string | undefined>(routeMetricSetId);

  const form = useForm<StandardMetricsFormData>({
    resolver: zodResolver(StandardMetricsFormSchema),
    defaultValues: {
      metric_set_id: routeMetricSetId, 
      metric_set_name: "", 
      metric_set_description: "",
      enabled_optional_sections: [],
      predefined_metrics: [],
      custom_metrics: [],
      visitor_profile_metrics: [],
    },
  });

  // Initialize draft management
  const { loadDraft, clearDraft, hasDraft } = useStandardMetricsDraft(form, currentMetricSetId);

  useEffect(() => {
    console.log('Route metric set ID changed:', routeMetricSetId);
    setCurrentMetricSetId(routeMetricSetId);
  }, [routeMetricSetId]);

  const { data: standardMetricData, isLoading: isLoadingMetricSet } = useQuery({
    queryKey: ['standardMetricSetWithSettings', currentMetricSetId],
    queryFn: async () => {
      if (!currentMetricSetId) return null;
      return getStandardMetricSetWithSettings(currentMetricSetId);
    },
    enabled: !!currentMetricSetId,
  });

  // Create default predefined metrics
  const createDefaultPredefinedMetrics = () => {
    return initialPredefinedMetricsConfig.map(config => {
      let targetValue;
      if (specificDropdownMetrics.includes(config.metric_identifier)) {
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
    });
  };

  // Initialize form data
  useEffect(() => {
    console.log('Form initialization effect - currentMetricSetId:', currentMetricSetId);
    console.log('standardMetricData:', standardMetricData);

    // Handle existing metric set
    if (currentMetricSetId && standardMetricData) {
      const { metricSet: existingMetricSet, settings: existingMetrics, enabledSections } = standardMetricData;
      
      console.log('Initializing form with existing data');

      // Initialize predefined metrics with existing data or defaults
      const predefinedMetricsData = initialPredefinedMetricsConfig.map(config => {
        const existing = existingMetrics.find(s => s.metric_identifier === config.metric_identifier && !s.is_custom);
        let targetValue;

        if (existing) {
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

      // Handle custom metrics (non-visitor profile)
      const customMetricsData = existingMetrics
        .filter(metric => metric.is_custom && metric.category !== VISITOR_PROFILE_CATEGORY)
        .map(metric => ({
          metric_identifier: metric.metric_identifier,
          label: metric.label,
          category: metric.category,
          target_value: metric.target_value,
          higher_is_better: metric.higher_is_better,
          units: metric.units || undefined,
          is_custom: true as const,
        }));

      // Handle visitor profile metrics
      const visitorProfileMetricsData = existingMetrics
        .filter(s => s.category === VISITOR_PROFILE_CATEGORY)
        .map(s => ({
          metric_identifier: s.metric_identifier,
          label: s.label,
          category: VISITOR_PROFILE_CATEGORY, 
          target_value: s.target_value,
          measurement_type: s.measurement_type,
          higher_is_better: s.higher_is_better,
        }));
      
      const formData: StandardMetricsFormData = {
        metric_set_id: existingMetricSet.id,
        metric_set_name: existingMetricSet.name,
        metric_set_description: existingMetricSet.description || "",
        enabled_optional_sections: enabledSections,
        predefined_metrics: predefinedMetricsData,
        custom_metrics: customMetricsData,
        visitor_profile_metrics: visitorProfileMetricsData,
      };

      console.log('Resetting form with existing data:', formData);
      form.reset(formData);
    } 
    // Handle new metric set - always check for draft first
    else if (!currentMetricSetId) {
      console.log('Initializing form for new metric set');
      
      // Always try to load draft data first
      const draftData = loadDraft();
      
      if (draftData) {
        console.log('Loading draft data:', draftData);
        form.reset(draftData);
      } else {
        console.log('No draft found, initializing with defaults');
        
        const defaultFormData: StandardMetricsFormData = {
          metric_set_id: undefined,
          metric_set_name: "",
          metric_set_description: "",
          enabled_optional_sections: [VISITOR_PROFILE_CATEGORY, ...Array.from(OPTIONAL_METRIC_CATEGORIES)],
          predefined_metrics: createDefaultPredefinedMetrics(),
          custom_metrics: [],
          visitor_profile_metrics: [],
        };

        form.reset(defaultFormData);
      }
    }
  }, [currentMetricSetId, standardMetricData, form, loadDraft]);

  const mutation = useMutation({
    mutationFn: async (formData: StandardMetricsFormData) => {
      let operatingMetricSetId = formData.metric_set_id || currentMetricSetId;

      if (!formData.metric_set_name || formData.metric_set_name.trim() === "") {
        throw new Error("Metric set name is required.");
      }

      if (operatingMetricSetId) {
        await updateStandardMetricSetName(operatingMetricSetId, formData.metric_set_name, formData.metric_set_description);
      } else {
        const newSet = await createStandardMetricSet({
          name: formData.metric_set_name,
          description: formData.metric_set_description,
        });
        operatingMetricSetId = newSet.id;
        setCurrentMetricSetId(newSet.id); 
        form.setValue('metric_set_id', newSet.id); 
        navigate(`/super-admin/standard-metrics/builder/${newSet.id}`, { replace: true });
      }

      if (!operatingMetricSetId) {
        throw new Error("Failed to get or create metric set ID.");
      }
      
      return saveStandardMetricSettings(operatingMetricSetId, formData);
    },
    onSuccess: (data, variables) => { 
      sonnerToast.success("Standard metric set saved successfully!");
      // Clear draft after successful save
      clearDraft();
      const finalMetricSetId = variables.metric_set_id || currentMetricSetId;
      queryClient.invalidateQueries({ queryKey: ['standardMetricSetWithSettings', finalMetricSetId] });
      queryClient.invalidateQueries({ queryKey: ['standardMetricSets'] });
    },
    onError: (error) => {
      sonnerToast.error(`Failed to save standard metrics: ${error.message}`);
    },
  });

  // Handle section toggle
  const handleSectionToggle = (sectionName: string, enabled: boolean) => {
    const currentEnabledSections = form.getValues('enabled_optional_sections') || [];
    let newEnabledSections;
    
    if (enabled) {
      newEnabledSections = [...currentEnabledSections, sectionName];
    } else {
      newEnabledSections = currentEnabledSections.filter(section => section !== sectionName);
    }
    
    form.setValue('enabled_optional_sections', newEnabledSections);
  };

  if (!isSuperAdmin) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <div className="text-destructive">
          <Shield className="h-12 w-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p>You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (isLoadingMetricSet) {
    return <div className="container mx-auto py-12 px-4 text-center">Loading...</div>;
  }

  const onSubmit = (data: StandardMetricsFormData) => {
    console.log("Standard metrics form data submitted:", data);
    mutation.mutate(data);
  };

  return (
    <TooltipProvider>
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <TargetIcon size={48} className="text-primary mr-4" />
          <div>
            <h1 className="text-3xl font-bold text-primary">Standard Metrics Builder</h1>
            <p className="text-muted-foreground">
              {currentMetricSetId ? "Edit a standard target metrics template." : "Create a new standard target metrics template."}
              {!currentMetricSetId && hasDraft() && (
                <span className="block text-sm text-green-600 mt-1 font-medium">
                  ✓ Draft auto-saved - your changes are preserved
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!currentMetricSetId && hasDraft() && (
            <Button 
              variant="outline" 
              onClick={() => {
                clearDraft();
                window.location.reload();
              }}
              className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10"
            >
              Clear Draft
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/super-admin/standard-metrics"><List className="mr-2"/> View All Standard Sets</Link>
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                Standard Metric Set Details
                <Badge variant="secondary">Super Admin</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="metric_set_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Standard Set Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Retail Store Standards" {...field} />
                    </FormControl>
                    <FormDescription>Give a descriptive name to this standard metric set.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="metric_set_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe when this standard set should be used..." {...field} />
                    </FormControl>
                    <FormDescription>Provide context about when this standard set should be used.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <PredefinedMetricsSection
            control={form.control as any}
            enabledSections={form.watch('enabled_optional_sections') || []}
            onSectionToggle={handleSectionToggle}
          />
          
          <Separator />

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="ghost" asChild>
              <Link to="/super-admin/standard-metrics">Cancel</Link>
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {mutation.isPending ? 'Saving...' : (currentMetricSetId || form.getValues().metric_set_id ? 'Update Standard Set' : 'Save New Standard Set')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
    </TooltipProvider>
  );
};

export default StandardMetricsBuilderPage;
