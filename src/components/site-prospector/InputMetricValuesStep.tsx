import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getEnabledCategories, sortCategoriesByOrder, predefinedMetricsConfig } from '@/config/targetMetricsConfig';
import { getTargetMetricSetById } from '@/services/targetMetrics/targetMetricSetService';
import { saveAssessmentMetricValues, getAssessmentMetricValues } from '@/services/siteAssessment/metricValues';
import { recalculateAssessmentScoresForMetricSet } from '@/services/assessmentRecalculationService';
import { useAuth } from '@/contexts/AuthContext';
import MetricInputField from './metric-input/MetricInputField';

interface InputMetricValuesStepProps {
  assessmentId: string;
  targetMetricSetId: string;
  onMetricsSubmitted: () => void;
  onBack: () => void;
}

interface MetricFormData {
  metrics: Array<{
    id: string;
    metric_identifier: string;
    entered_value: number | null;
    notes: string | null;
  }>;
}

const InputMetricValuesStep: React.FC<InputMetricValuesStepProps> = ({
  assessmentId,
  targetMetricSetId,
  onMetricsSubmitted,
  onBack,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [metricSet, setMetricSet] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormReady, setIsFormReady] = useState(false);

  const form = useForm<MetricFormData>({
    defaultValues: { metrics: [] },
    mode: 'onChange'
  });

  // Watch form changes to ensure UI updates when data loads
  const watchedMetrics = form.watch('metrics');

  useEffect(() => {
    const fetchMetricSetAndLoadData = async () => {
      console.log('[InputMetricValuesStep] Starting data fetch for metric set:', targetMetricSetId, 'assessment:', assessmentId);
      
      if (!user?.id) {
        console.error('[InputMetricValuesStep] No user ID available');
        setError('User not authenticated');
        setIsLoading(false);
        return;
      }

      try {
        // Step 1: Fetch the metric set
        const fetchedMetricSet = await getTargetMetricSetById(targetMetricSetId, user.id);
        
        if (!fetchedMetricSet) {
          console.error('[InputMetricValuesStep] No metric set found');
          setError('Target metric set not found');
          setIsLoading(false);
          return;
        }

        console.log('[InputMetricValuesStep] Successfully fetched metric set:', {
          name: fetchedMetricSet.name,
          settingsCount: fetchedMetricSet.user_custom_metrics_settings?.length || 0
        });

        setMetricSet(fetchedMetricSet);

        // Step 2: Initialize form structure with metric set data
        const initialMetrics: MetricFormData['metrics'] = [];
        if (fetchedMetricSet.user_custom_metrics_settings) {
          fetchedMetricSet.user_custom_metrics_settings.forEach((setting: any, index: number) => {
            initialMetrics.push({
              id: setting.id || `temp-${index}`,
              metric_identifier: setting.metric_identifier,
              entered_value: null,
              notes: null,
            });
          });
        }

        console.log('[InputMetricValuesStep] Initial metrics structure created:', initialMetrics.length, 'metrics');

        // Step 3: Load existing values and merge with initial structure
        try {
          const existingValues = await getAssessmentMetricValues(assessmentId);
          console.log('[InputMetricValuesStep] Found existing metric values:', existingValues.length);
          console.log('[InputMetricValuesStep] Existing values data:', existingValues);
          
          // Populate form with existing values
          existingValues.forEach((metricValue) => {
            const metricIndex = initialMetrics.findIndex(m => m.metric_identifier === metricValue.metric_identifier);
            console.log('[InputMetricValuesStep] Mapping existing value:', {
              metric_identifier: metricValue.metric_identifier,
              entered_value: metricValue.entered_value,
              notes: metricValue.notes,
              metricIndex
            });
            
            if (metricIndex !== -1) {
              initialMetrics[metricIndex] = {
                ...initialMetrics[metricIndex],
                entered_value: metricValue.entered_value,
                notes: metricValue.notes || null,
              };
            }
          });
          
          console.log('[InputMetricValuesStep] Final initial metrics with existing values:', initialMetrics);
        } catch (err) {
          console.log('[InputMetricValuesStep] No existing values found or error loading them:', err);
        }

        // Step 4: Reset form with complete data (metrics + existing values)
        console.log('[InputMetricValuesStep] Resetting form with complete data');
        form.reset({ metrics: initialMetrics });
        
        // Step 5: Mark form as ready
        setIsFormReady(true);
        setError(null);
        
        console.log('[InputMetricValuesStep] Form reset complete, data loading finished');

      } catch (err) {
        console.error('[InputMetricValuesStep] Error fetching metric set:', err);
        setError('Failed to load metric set');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetricSetAndLoadData();
  }, [targetMetricSetId, user?.id, assessmentId, form]);

  // Debug form state changes
  useEffect(() => {
    if (isFormReady && watchedMetrics.length > 0) {
      console.log('[InputMetricValuesStep] Form state after reset:', {
        metricsCount: watchedMetrics.length,
        sampleMetric: watchedMetrics[0],
        formReady: isFormReady
      });
    }
  }, [watchedMetrics, isFormReady]);

  const handleSubmit = async (data: MetricFormData) => {
    if (!metricSet || !user?.id) return;

    setIsSaving(true);
    try {
      // Convert form data to the service format
      const metricValuesList = data.metrics.map((metric) => {
        const metricSetting = metricSet.user_custom_metrics_settings.find((m: any) => m.metric_identifier === metric.metric_identifier);
        
        return {
          assessment_id: assessmentId,
          metric_identifier: metric.metric_identifier,
          category: metricSetting?.category || '',
          label: metricSetting?.label || '',
          entered_value: metric.entered_value,
          notes: metric.notes || null,
          measurement_type: metricSetting?.measurement_type || null,
          image_url: null
        };
      });

      console.log('[InputMetricValuesStep] Saving metrics:', metricValuesList);
      await saveAssessmentMetricValues(assessmentId, metricValuesList);

      // Recalculate scores after saving metric values
      console.log('[InputMetricValuesStep] Recalculating scores for metric set:', targetMetricSetId);
      await recalculateAssessmentScoresForMetricSet(targetMetricSetId, user.id);

      toast({
        title: "Success",
        description: "Metric values saved and scores calculated successfully",
      });

      onMetricsSubmitted();
    } catch (error) {
      console.error('Error saving metric values:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save metric values";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Loading metric set...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertCircle className="h-5 w-5 mr-2" />
              Error Loading Metric Set
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!metricSet) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Metric set not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check if we have any custom metrics configured
  const hasCustomMetrics = metricSet.user_custom_metrics_settings && metricSet.user_custom_metrics_settings.length > 0;

  if (!hasCustomMetrics) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>No Custom Metrics Configuration</CardTitle>
            <CardDescription>
              The selected target metric set "{metricSet.name}" does not have any custom metrics configured.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please configure custom metrics for this target metric set or select a different metric set.
              </AlertDescription>
            </Alert>
            
            <div className="mt-4 space-x-2">
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Metric Set Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Don't render form until it's ready with data
  if (!isFormReady) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Loading assessment data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper function to sort metrics within a category based on predefined order
  const sortMetricsWithinCategory = (metrics: any[]) => {
    return metrics.sort((a, b) => {
      const indexA = predefinedMetricsConfig.findIndex(config => config.metric_identifier === a.metric_identifier);
      const indexB = predefinedMetricsConfig.findIndex(config => config.metric_identifier === b.metric_identifier);
      
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      return a.label.localeCompare(b.label);
    });
  };

  // Get enabled categories for organizing metrics and sort them in the correct order
  const enabledCategories = sortCategoriesByOrder(getEnabledCategories(metricSet.enabled_optional_sections || []));

  // Transform metrics for MetricInputField component
  const transformMetricForInput = (setting: any, formIndex: number) => {
    // Use watched metrics to ensure UI updates when form data changes
    const formData = watchedMetrics[formIndex];
    return {
      id: setting.id || `temp-${formIndex}`,
      originalIndex: formIndex,
      metric_identifier: setting.metric_identifier,
      label: setting.label,
      category: setting.category,
      entered_value: formData?.entered_value ?? null,
      notes: formData?.notes ?? null,
      target_value: setting.target_value,
      higher_is_better: setting.higher_is_better,
      measurement_type: setting.measurement_type,
    };
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Input Metric Values</CardTitle>
          <CardDescription>
            Enter values for the metrics in your target metric set: {metricSet.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                {/* Metric input sections organized by category */}
                {enabledCategories.map((category) => {
                  const categoryMetrics = sortMetricsWithinCategory(
                    metricSet.user_custom_metrics_settings.filter((m: any) => m.category === category)
                  );
                  
                  if (categoryMetrics.length === 0) return null;
                  
                  return (
                    <div key={category} className="space-y-4 border-t pt-6 first:border-t-0 first:pt-0">
                      <h3 className="text-lg font-semibold text-primary">{category}</h3>
                      <div className="space-y-4">
                        {categoryMetrics.map((metric: any) => {
                          const formIndex = watchedMetrics.findIndex(m => m.metric_identifier === metric.metric_identifier);
                          
                          if (formIndex === -1) return null;
                          
                          const transformedMetric = transformMetricForInput(metric, formIndex);
                          
                          return (
                            <MetricInputField
                              key={metric.metric_identifier}
                              metricField={transformedMetric}
                              control={form.control}
                              errors={form.formState.errors}
                              disabled={isSaving}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <div className="flex justify-between pt-6">
                  <Button type="button" variant="outline" onClick={onBack}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Metrics'}
                  </Button>
                </div>
              </form>
            </Form>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
};

export default InputMetricValuesStep;
