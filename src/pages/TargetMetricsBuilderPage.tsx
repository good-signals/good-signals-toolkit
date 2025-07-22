import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, Save, Target, Loader2, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTargetMetricSetById,
  createTargetMetricSet,
  updateTargetMetricSet,
} from '@/services/targetMetrics/targetMetricSetService';
import { triggerAssessmentRecalculation } from '@/services/targetMetrics/metricRecalculationService';
import {
  TargetMetricsFormSchema,
  type TargetMetricsFormData,
  VISITOR_PROFILE_CATEGORY,
} from '@/types/targetMetrics';
import { getDefaultEnabledOptionalSections, generateEmptyPredefinedMetrics } from '@/config/targetMetricsConfig';
import { getAccountForUser } from '@/services/targetMetrics/accountHelpers';
import { getStandardMetricSettings } from '@/services/standardMetricsService';
import PredefinedMetricsSection from '@/components/target-metrics/PredefinedMetricsSection';
import VisitorProfileMetricsSection from '@/components/target-metrics/VisitorProfileMetricsSection';

import { TemplateSelectionStep } from "@/components/target-metrics/TemplateSelectionStep";
import { CustomSectionManagement } from "@/components/target-metrics/CustomSectionManagement";
import CustomMetricForm from '@/components/target-metrics/CustomMetricForm';

const TargetMetricsBuilderPage = () => {
  const { metricSetId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'template' | 'configuration'>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [sectionManagementOpen, setSectionManagementOpen] = useState(false);
  const [customMetricFormOpen, setCustomMetricFormOpen] = useState(false);

  const form = useForm<TargetMetricsFormData>({
    resolver: zodResolver(TargetMetricsFormSchema),
    defaultValues: {
      metric_set_name: '',
      predefined_metrics: [],
      custom_metrics: [],
      visitor_profile_metrics: [],
      enabled_optional_sections: getDefaultEnabledOptionalSections(),
    },
  });

  // Skip template selection for editing existing metric sets
  useEffect(() => {
    if (metricSetId) {
      setCurrentStep('configuration');
    }
  }, [metricSetId]);

  // Get account ID for the user
  useEffect(() => {
    const fetchAccountId = async () => {
      if (user?.id) {
        try {
          const userAccountId = await getAccountForUser(user.id);
          setAccountId(userAccountId);
        } catch (error) {
          console.error('Error fetching account ID:', error);
          toast({
            title: "Error",
            description: "Failed to load account information",
            variant: "destructive",
          });
        }
      }
    };
    fetchAccountId();
  }, [user?.id]);

  // Load template metrics when template is selected
  const { data: templateMetrics } = useQuery({
    queryKey: ['templateMetrics', selectedTemplateId],
    queryFn: () => selectedTemplateId ? getStandardMetricSettings(selectedTemplateId) : null,
    enabled: !!selectedTemplateId && currentStep === 'template',
  });

  // Populate form with template data when template is selected
  useEffect(() => {
    if (templateMetrics && selectedTemplateId && currentStep === 'template') {
      console.log('[TargetMetricsBuilderPage] Populating form with template metrics:', templateMetrics.length);
      
      // Reset arrays first
      form.setValue('predefined_metrics', []);
      form.setValue('custom_metrics', []);
      form.setValue('visitor_profile_metrics', []);
      
      // Populate metrics from template
      templateMetrics.forEach((setting) => {
        if (setting.category === VISITOR_PROFILE_CATEGORY) {
          const currentMetrics = form.getValues('visitor_profile_metrics') || [];
          form.setValue('visitor_profile_metrics', [
            ...currentMetrics,
            {
              metric_identifier: setting.metric_identifier,
              label: setting.label,
              category: VISITOR_PROFILE_CATEGORY,
              target_value: setting.target_value,
              measurement_type: (setting.measurement_type as "Index" | "Amount" | "Percentage") || "Index",
              higher_is_better: setting.higher_is_better,
            },
          ]);
        } else if (setting.metric_identifier.startsWith('custom_')) {
          // This is a custom metric
          const currentMetrics = form.getValues('custom_metrics') || [];
          form.setValue('custom_metrics', [
            ...currentMetrics,
            {
              metric_identifier: setting.metric_identifier,
              label: setting.label,
              category: setting.category,
              target_value: setting.target_value,
              higher_is_better: setting.higher_is_better,
              units: setting.units || setting.measurement_type || '',
              is_custom: true as const,
            },
          ]);
        } else {
          // This is a predefined metric
          const currentMetrics = form.getValues('predefined_metrics') || [];
          form.setValue('predefined_metrics', [
            ...currentMetrics,
            {
              metric_identifier: setting.metric_identifier,
              label: setting.label,
              category: setting.category,
              target_value: setting.target_value,
              higher_is_better: setting.higher_is_better,
            },
          ]);
        }
      });
    }
  }, [templateMetrics, selectedTemplateId, currentStep, form]);

  // Load existing metric set if editing
  const { data: existingMetricSet, isLoading: isLoadingMetricSet, error: metricSetError } = useQuery({
    queryKey: ['targetMetricSet', metricSetId, user?.id],
    queryFn: async () => {
      if (!metricSetId || !user?.id) return null;
      console.log('[TargetMetricsBuilderPage] Fetching metric set:', metricSetId);
      return await getTargetMetricSetById(metricSetId, user.id);
    },
    enabled: !!metricSetId && !!user?.id,
  });

  // Populate form when editing
  useEffect(() => {
    if (existingMetricSet) {
      console.log('[TargetMetricsBuilderPage] Populating form with existing metric set:', existingMetricSet);
      
      form.setValue('metric_set_name', existingMetricSet.name);
      form.setValue('metric_set_id', existingMetricSet.id);
      
      // Set enabled optional sections (fallback to all if not specified for backward compatibility)
      form.setValue('enabled_optional_sections', existingMetricSet.enabled_optional_sections || getDefaultEnabledOptionalSections());
      
      // Reset arrays first
      form.setValue('predefined_metrics', []);
      form.setValue('custom_metrics', []);
      form.setValue('visitor_profile_metrics', []);
      
      // Populate metrics if they exist
      if (existingMetricSet.user_custom_metrics_settings && existingMetricSet.user_custom_metrics_settings.length > 0) {
        console.log('[TargetMetricsBuilderPage] Processing metric settings:', existingMetricSet.user_custom_metrics_settings.length);
        
        existingMetricSet.user_custom_metrics_settings.forEach((setting) => {
          if (setting.category === VISITOR_PROFILE_CATEGORY) {
            const currentMetrics = form.getValues('visitor_profile_metrics') || [];
            form.setValue('visitor_profile_metrics', [
              ...currentMetrics,
              {
                metric_identifier: setting.metric_identifier,
                label: setting.label,
                category: VISITOR_PROFILE_CATEGORY,
                target_value: setting.target_value,
                measurement_type: (setting.measurement_type as "Index" | "Amount" | "Percentage") || "Index",
                higher_is_better: setting.higher_is_better,
                id: setting.id,
              },
            ]);
          } else if (setting.metric_identifier.startsWith('custom_')) {
            // This is a custom metric
            const currentMetrics = form.getValues('custom_metrics') || [];
            form.setValue('custom_metrics', [
              ...currentMetrics,
              {
                metric_identifier: setting.metric_identifier,
                label: setting.label,
                category: setting.category,
                target_value: setting.target_value,
                higher_is_better: setting.higher_is_better,
                units: setting.measurement_type,
                is_custom: true as const,
                id: setting.id,
              },
            ]);
          } else {
            // This is a predefined metric
            const currentMetrics = form.getValues('predefined_metrics') || [];
            form.setValue('predefined_metrics', [
              ...currentMetrics,
              {
                metric_identifier: setting.metric_identifier,
                label: setting.label,
                category: setting.category,
                target_value: setting.target_value,
                higher_is_better: setting.higher_is_better,
                id: setting.id,
              },
            ]);
          }
        });
      } else {
        console.warn('[TargetMetricsBuilderPage] No user_custom_metrics_settings found for metric set. This may indicate a data integrity issue.');
      }
    }
  }, [existingMetricSet, form]);

  const handleTemplateSelect = (templateId: string | null) => {
    setSelectedTemplateId(templateId);
  };

  const handleContinueFromTemplate = () => {
    if (selectedTemplateId === null) {
      // Starting from scratch - populate with all available predefined metrics with default values
      console.log('[TargetMetricsBuilderPage] Starting from scratch - populating with empty predefined metrics');
      const enabledOptionalSections = form.getValues('enabled_optional_sections') || [];
      const emptyPredefinedMetrics = generateEmptyPredefinedMetrics(enabledOptionalSections);
      
      form.setValue('predefined_metrics', emptyPredefinedMetrics);
      form.setValue('custom_metrics', []);
      form.setValue('visitor_profile_metrics', []);
    }
    setCurrentStep('configuration');
  };

  // Save/Update mutation with assessment recalculation
  const saveMutation = useMutation({
    mutationFn: async (data: TargetMetricsFormData) => {
      if (!user?.id || !accountId) {
        throw new Error('User not authenticated or account not found');
      }

      // For existing metric sets, we only need to save the metric set name and predefined metrics
      // since visitor profile and custom metrics are saved individually
      const formDataToSave = {
        ...data,
        visitor_profile_metrics: metricSetId ? [] : data.visitor_profile_metrics,
        custom_metrics: metricSetId ? [] : data.custom_metrics,
      };

      let result;
      if (metricSetId) {
        console.log('[TargetMetricsBuilderPage] Updating metric set:', metricSetId);
        result = await updateTargetMetricSet(metricSetId, formDataToSave, user.id, accountId);
      } else {
        console.log('[TargetMetricsBuilderPage] Creating new metric set');
        result = await createTargetMetricSet(formDataToSave, user.id, accountId);
      }

      // Trigger assessment recalculation if updating an existing set
      if (metricSetId && user?.id) {
        console.log('[TargetMetricsBuilderPage] Triggering assessment recalculation for metric set:', metricSetId);
        try {
          const recalcResult = await triggerAssessmentRecalculation(metricSetId, user.id);
          if (recalcResult.success) {
            toast({
              title: "Assessments Updated",
              description: recalcResult.message,
            });
          } else {
            toast({
              title: "Assessment Recalculation Warning",
              description: recalcResult.message,
              variant: "destructive",
            });
          }
        } catch (recalcError) {
          console.error('[TargetMetricsBuilderPage] Error during assessment recalculation:', recalcError);
          toast({
            title: "Assessment Recalculation Failed",
            description: "Target metrics were saved, but assessment scores could not be recalculated.",
            variant: "destructive",
          });
        }
      }

      return result;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Target metric set ${metricSetId ? 'updated' : 'created'} successfully!`,
      });
      queryClient.invalidateQueries({ queryKey: ['targetMetricSets'] });
      queryClient.invalidateQueries({ queryKey: ['siteAssessments'] });
      queryClient.invalidateQueries({ queryKey: ['assessmentDetails'] });
      navigate('/target-metric-sets');
    },
    onError: (error: Error) => {
      console.error('Error saving target metrics:', error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${metricSetId ? 'update' : 'create'} target metric set`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TargetMetricsFormData) => {
    console.log('[TargetMetricsBuilderPage] Submitting form data:', data);
    saveMutation.mutate(data);
  };

  if (isLoadingMetricSet) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="text-center">Loading metric set...</div>
      </div>
    );
  }

  if (metricSetError) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="text-center text-destructive">
          <p className="text-lg mb-4">Error loading metric set</p>
          <p className="text-sm text-muted-foreground mb-4">
            {metricSetError.message || 'The metric set could not be found or you may not have permission to access it.'}
          </p>
          <Button onClick={() => navigate('/target-metric-sets')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Target Metric Sets
          </Button>
        </div>
      </div>
    );
  }

  if (metricSetId && !existingMetricSet) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="text-center">
          <p className="text-lg mb-4">Metric set not found</p>
          <Button onClick={() => navigate('/target-metric-sets')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Target Metric Sets
          </Button>
        </div>
      </div>
    );
  }

  // Show template selection step for new metric sets
  if (!metricSetId && currentStep === 'template') {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-6 w-6" />
                Create Target Metrics Set
              </CardTitle>
              <CardDescription>
                Choose how you want to start creating your target metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TemplateSelectionStep
                onTemplateSelect={handleTemplateSelect}
                selectedTemplateId={selectedTemplateId}
              />
              <div className="flex gap-4 mt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/target-metric-sets')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  onClick={handleContinueFromTemplate}
                  disabled={selectedTemplateId === undefined}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleSectionToggle = (sectionName: string, enabled: boolean) => {
    const currentSections = form.getValues('enabled_optional_sections') || [];
    const updatedSections = enabled
      ? [...currentSections.filter(s => s !== sectionName), sectionName]
      : currentSections.filter(s => s !== sectionName);
    form.setValue('enabled_optional_sections', updatedSections);
    
    // When toggling a section, also update the predefined metrics if we're starting from scratch
    if (selectedTemplateId === null) {
      const emptyPredefinedMetrics = generateEmptyPredefinedMetrics(updatedSections);
      form.setValue('predefined_metrics', emptyPredefinedMetrics);
    }
  };

  const handleAddCustomMetric = () => {
    setCustomMetricFormOpen(true);
  };

  const handleCustomMetricSubmit = (data: any) => {
    const newMetric = {
      metric_identifier: `custom_${Date.now()}`,
      label: data.name,
      category: data.category,
      target_value: data.target_value,
      higher_is_better: data.higher_is_better,
      units: data.units,
      is_custom: true as const,
    };
    appendCustom(newMetric);
    setCustomMetricFormOpen(false);
  };

  // Show configuration step
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Target Metrics Builder</h1>
            <p className="text-muted-foreground">
              {metricSetId ? "Edit your target metric set" : "Create a new target metric set to define success criteria for your site assessments"}
            </p>
          </div>
          {accountId && (
            <Button
              variant="outline"
              onClick={() => setSectionManagementOpen(true)}
              className="shrink-0"
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage Sections
            </Button>
          )}
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-6 w-6" />
              {metricSetId ? 'Edit Target Metrics Set' : 'Create Target Metrics Set'}
            </CardTitle>
            <CardDescription>
              {metricSetId 
                ? 'Update your target metrics configuration'
                : 'Define your target metrics and KPIs for site assessment'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="metric_set_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Metric Set Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter a name for this metric set"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <PredefinedMetricsSection 
                  control={form.control}
                  enabledSections={form.watch('enabled_optional_sections') || []}
                  onSectionToggle={handleSectionToggle}
                  metricSetId={metricSetId}
                  accountId={accountId}
                  onAddCustomMetric={handleAddCustomMetric}
                />

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!metricSetId && currentStep === 'configuration') {
                        setCurrentStep('template');
                      } else {
                        navigate('/target-metric-sets');
                      }
                    }}
                    disabled={saveMutation.isPending}
                  >
                    {!metricSetId && currentStep === 'configuration' ? (
                      <>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Template
                      </>
                    ) : (
                      'Cancel'
                    )}
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {metricSetId ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      metricSetId ? 'Update Metric Set' : 'Create Metric Set'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      
      {accountId && (
        <>
          <CustomSectionManagement
            open={sectionManagementOpen}
            onOpenChange={setSectionManagementOpen}
            accountId={accountId}
          />
          
          <CustomMetricForm
            open={customMetricFormOpen}
            onOpenChange={setCustomMetricFormOpen}
            onSubmit={handleCustomMetricSubmit}
            isEditing={false}
          />
        </>
      )}
    </div>
  );
};

export default TargetMetricsBuilderPage;
