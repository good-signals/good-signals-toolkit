
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getEnabledCategories, sortCategoriesByOrder, predefinedMetricsConfig } from '@/config/targetMetricsConfig';
import { getTargetMetricSetById } from '@/services/targetMetrics/targetMetricSetService';
import { saveAssessmentMetricValues } from '@/services/siteAssessment/metricValues';
import { recalculateAssessmentScoresForMetricSet } from '@/services/assessmentRecalculationService';
import { useAuth } from '@/contexts/AuthContext';

interface InputMetricValuesStepProps {
  assessmentId: string;
  targetMetricSetId: string;
  onMetricsSubmitted: () => void;
  onBack: () => void;
}

interface MetricFormData {
  [key: string]: {
    value: number;
    notes?: string;
    image?: File;
  };
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

  const form = useForm<MetricFormData>({
    defaultValues: {}
  });

  useEffect(() => {
    const fetchMetricSet = async () => {
      console.log('[InputMetricValuesStep] Fetching metric set:', targetMetricSetId, 'for user:', user?.id);
      
      if (!user?.id) {
        console.error('[InputMetricValuesStep] No user ID available');
        setError('User not authenticated');
        setIsLoading(false);
        return;
      }

      try {
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
        setError(null);

        // Initialize form with default values
        const initialValues: MetricFormData = {};
        if (fetchedMetricSet.user_custom_metrics_settings) {
          fetchedMetricSet.user_custom_metrics_settings.forEach((setting: any) => {
            initialValues[setting.metric_identifier] = {
              value: 0,
              notes: '',
            };
          });
        }
        form.reset(initialValues);

      } catch (err) {
        console.error('[InputMetricValuesStep] Error fetching metric set:', err);
        setError('Failed to load metric set');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetricSet();
  }, [targetMetricSetId, user?.id, form]);

  const handleSubmit = async (data: MetricFormData) => {
    if (!metricSet || !user?.id) return;

    setIsSaving(true);
    try {
      // Convert form data to the service format
      const metricValuesList = Object.entries(data).map(([metricId, metricData]) => {
        const metricSetting = metricSet.user_custom_metrics_settings.find((m: any) => m.metric_identifier === metricId);
        
        return {
          assessment_id: assessmentId,
          metric_identifier: metricId,
          category: metricSetting?.category || '',
          label: metricSetting?.label || '',
          entered_value: metricData.value,
          notes: metricData.notes || null,
          measurement_type: metricSetting?.measurement_type || null,
          image_url: null // Image handling will be added later
        };
      });

      console.log('[InputMetricValuesStep] Saving metrics:', metricValuesList);
      await saveAssessmentMetricValues(assessmentId, metricValuesList);

      toast({
        title: "Success",
        description: "Metric values saved successfully",
      });

      onMetricsSubmitted();
    } catch (error) {
      console.error('Error saving metric values:', error);
      toast({
        title: "Error",
        description: "Failed to save metric values",
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

  // Helper function to sort metrics within a category based on predefined order
  const sortMetricsWithinCategory = (metrics: any[]) => {
    return metrics.sort((a, b) => {
      const indexA = predefinedMetricsConfig.findIndex(config => config.metric_identifier === a.metric_identifier);
      const indexB = predefinedMetricsConfig.findIndex(config => config.metric_identifier === b.metric_identifier);
      
      // If both metrics are in the predefined config, sort by their position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // If only one is in the predefined config, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      // If neither is in the predefined config, sort alphabetically by label
      return a.label.localeCompare(b.label);
    });
  };

  // Get enabled categories for organizing metrics and sort them in the correct order
  const enabledCategories = sortCategoriesByOrder(getEnabledCategories(metricSet.enabled_optional_sections || []));

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
                    {categoryMetrics.map((metric: any) => (
                      <div key={metric.metric_identifier} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{metric.label}</h4>
                          <p className="text-sm text-muted-foreground">
                            {metric.higher_is_better ? "Higher is better" : "Lower is better"}
                            {metric.measurement_type && ` • ${metric.measurement_type}`}
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <FormField
                            control={form.control}
                            name={`${metric.metric_identifier}.value`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Value</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="Enter value"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    disabled={isSaving}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name={`${metric.metric_identifier}.notes`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notes (Optional)</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Add notes..."
                                    {...field}
                                    disabled={isSaving}
                                    rows={2}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ))}
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
        </CardContent>
      </Card>
    </div>
  );
};

export default InputMetricValuesStep;
