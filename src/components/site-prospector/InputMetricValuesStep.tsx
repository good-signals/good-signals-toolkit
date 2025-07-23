
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
import CategorySection from './metric-input/CategorySection';
import SiteVisitSection from './metric-input/SiteVisitSection';
import { getEnabledCategories } from '@/config/targetMetricsConfig';
import { getTargetMetricSetById } from '@/services/targetMetrics/targetMetricSetService';
import { saveAssessmentMetricValues } from '@/services/siteAssessment/metricValues';
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
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const form = useForm<MetricFormData>({
    defaultValues: {}
  });

  useEffect(() => {
    const fetchMetricSet = async () => {
      console.log('=== PHASE 1: DEBUGGING DATA FLOW ===');
      console.log('[InputMetricValuesStep] Starting comprehensive fetch with:', {
        targetMetricSetId,
        userId: user?.id,
        assessmentId
      });
      
      if (!user?.id) {
        console.error('[InputMetricValuesStep] No user ID available');
        setError('User not authenticated');
        setIsLoading(false);
        return;
      }

      try {
        // Add detailed debugging for the service call
        console.log('[InputMetricValuesStep] Calling getTargetMetricSetById...');
        const fetchedMetricSet = await getTargetMetricSetById(targetMetricSetId, user.id);
        
        // Comprehensive debug information
        const debugData = {
          fetchedMetricSet,
          hasMetricSet: !!fetchedMetricSet,
          metricSetName: fetchedMetricSet?.name,
          userCustomMetricsSettings: fetchedMetricSet?.user_custom_metrics_settings,
          settingsCount: fetchedMetricSet?.user_custom_metrics_settings?.length || 0,
          settingsIsArray: Array.isArray(fetchedMetricSet?.user_custom_metrics_settings),
          enabledSectionsCount: fetchedMetricSet?.enabled_optional_sections?.length || 0,
          enabledSections: fetchedMetricSet?.enabled_optional_sections,
          hasEnabledSectionsData: fetchedMetricSet?.has_enabled_sections_data,
          rawResponse: fetchedMetricSet
        };

        console.log('[InputMetricValuesStep] COMPREHENSIVE DEBUG INFO:', debugData);
        setDebugInfo(debugData);

        if (!fetchedMetricSet) {
          console.error('[InputMetricValuesStep] No metric set found');
          setError('Target metric set not found');
          setIsLoading(false);
          return;
        }

        // Detailed analysis of the user_custom_metrics_settings
        if (fetchedMetricSet.user_custom_metrics_settings) {
          console.log('[InputMetricValuesStep] Analyzing user_custom_metrics_settings:');
          console.log('- Type:', typeof fetchedMetricSet.user_custom_metrics_settings);
          console.log('- Is Array:', Array.isArray(fetchedMetricSet.user_custom_metrics_settings));
          console.log('- Length:', fetchedMetricSet.user_custom_metrics_settings.length);
          console.log('- First 3 items:', fetchedMetricSet.user_custom_metrics_settings.slice(0, 3));
          
          // Check each metric setting
          fetchedMetricSet.user_custom_metrics_settings.forEach((setting: any, index: number) => {
            console.log(`[InputMetricValuesStep] Metric ${index + 1}:`, {
              id: setting.id,
              metric_identifier: setting.metric_identifier,
              label: setting.label,
              category: setting.category,
              target_value: setting.target_value,
              user_id: setting.user_id,
              metric_set_id: setting.metric_set_id
            });
          });
        } else {
          console.warn('[InputMetricValuesStep] user_custom_metrics_settings is null/undefined');
        }

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
        setDebugInfo({ error: err });
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

  const handleRefresh = () => {
    setIsLoading(true);
    setError(null);
    setDebugInfo(null);
    // Trigger useEffect to re-fetch data
    window.location.reload();
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
            
            {debugInfo && (
              <div className="bg-muted p-4 rounded-md">
                <h4 className="font-medium mb-2">Debug Information:</h4>
                <pre className="text-xs overflow-auto max-h-40">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button variant="outline" onClick={handleRefresh}>
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

  console.log('[InputMetricValuesStep] About to render with metric set:', {
    metricSetName: metricSet.name,
    hasUserCustomMetricsSettings: !!metricSet.user_custom_metrics_settings,
    userCustomMetricsSettingsLength: metricSet.user_custom_metrics_settings?.length || 0,
    enabledOptionalSections: metricSet.enabled_optional_sections
  });

  // Check if we have any custom metrics configured
  const hasCustomMetrics = metricSet.user_custom_metrics_settings && metricSet.user_custom_metrics_settings.length > 0;

  console.log('[InputMetricValuesStep] hasCustomMetrics check:', {
    hasCustomMetrics,
    settingsExists: !!metricSet.user_custom_metrics_settings,
    settingsIsArray: Array.isArray(metricSet.user_custom_metrics_settings),
    settingsLength: metricSet.user_custom_metrics_settings?.length
  });

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
            
            {debugInfo && (
              <div className="bg-muted p-4 rounded-md">
                <h4 className="font-medium mb-2">Debug Information:</h4>
                <pre className="text-xs overflow-auto max-h-60">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}
            
            <div className="mt-4 space-x-2">
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Metric Set Selection
              </Button>
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get enabled categories for organizing metrics
  const enabledCategories = getEnabledCategories(metricSet.enabled_optional_sections || []);

  console.log('[InputMetricValuesStep] Enabled categories:', enabledCategories);

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
              {/* Debug information panel */}
              {debugInfo && (
                <div className="bg-muted p-4 rounded-md">
                  <h4 className="font-medium mb-2">Debug Information:</h4>
                  <div className="text-xs space-y-1">
                    <p>Metric Set: {debugInfo.metricSetName}</p>
                    <p>Settings Count: {debugInfo.settingsCount}</p>
                    <p>Enabled Sections: {debugInfo.enabledSectionsCount}</p>
                    <p>Has Enabled Sections Data: {String(debugInfo.hasEnabledSectionsData)}</p>
                  </div>
                </div>
              )}

              {/* Metric input sections organized by category */}
              {enabledCategories.map((category) => {
                const categoryMetrics = metricSet.user_custom_metrics_settings.filter((m: any) => m.category === category);
                
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
