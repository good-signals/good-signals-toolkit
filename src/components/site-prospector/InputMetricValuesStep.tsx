
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
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
  const [metricValues, setMetricValues] = useState<Record<string, number>>({});
  const [imageUploads, setImageUploads] = useState<Record<string, File>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchMetricSet = async () => {
      console.log('[InputMetricValuesStep] Starting fetch with:', {
        targetMetricSetId,
        userId: user?.id
      });
      
      if (!user?.id) {
        console.error('[InputMetricValuesStep] No user ID available');
        setError('User not authenticated');
        setIsLoading(false);
        return;
      }

      try {
        const fetchedMetricSet = await getTargetMetricSetById(targetMetricSetId, user.id);
        console.log('[InputMetricValuesStep] Fetched metric set:', {
          hasMetricSet: !!fetchedMetricSet,
          metricSetName: fetchedMetricSet?.name,
          settingsCount: fetchedMetricSet?.user_custom_metrics_settings?.length || 0,
          enabledSectionsCount: fetchedMetricSet?.enabled_optional_sections?.length || 0,
          rawMetricSet: fetchedMetricSet
        });

        if (!fetchedMetricSet) {
          console.error('[InputMetricValuesStep] No metric set found');
          setError('Target metric set not found');
          setIsLoading(false);
          return;
        }

        // Debug the user_custom_metrics_settings property specifically
        console.log('[InputMetricValuesStep] Analyzing user_custom_metrics_settings:', {
          isArray: Array.isArray(fetchedMetricSet.user_custom_metrics_settings),
          length: fetchedMetricSet.user_custom_metrics_settings?.length,
          type: typeof fetchedMetricSet.user_custom_metrics_settings,
          firstThreeItems: fetchedMetricSet.user_custom_metrics_settings?.slice(0, 3)
        });

        setMetricSet(fetchedMetricSet);
        setError(null);
      } catch (err) {
        console.error('[InputMetricValuesStep] Error fetching metric set:', err);
        setError('Failed to load metric set');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetricSet();
  }, [targetMetricSetId, user?.id]);

  const handleMetricValueChange = (metricId: string, value: number) => {
    setMetricValues(prev => ({
      ...prev,
      [metricId]: value
    }));
  };

  const handleImageUpload = (metricId: string, file: File) => {
    setImageUploads(prev => ({
      ...prev,
      [metricId]: file
    }));
  };

  const handleNotesChange = (metricId: string, value: string) => {
    setNotes(prev => ({
      ...prev,
      [metricId]: value
    }));
  };

  const handleSubmit = async () => {
    if (!metricSet || !user?.id) return;

    setIsSaving(true);
    try {
      // Convert the component state to the service format
      const metricValuesList = Object.entries(metricValues).map(([metricId, value]) => {
        // Find the metric setting to get category and label
        const metricSetting = metricSet.user_custom_metrics_settings.find((m: any) => m.metric_identifier === metricId);
        
        return {
          assessment_id: assessmentId,
          metric_identifier: metricId,
          category: metricSetting?.category || '',
          label: metricSetting?.label || '',
          entered_value: value,
          notes: notes[metricId] || null,
          measurement_type: metricSetting?.measurement_type || null,
          image_url: null // Image handling will be added later
        };
      });

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
        <div className="animate-pulse">Loading metric set...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
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
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please configure custom metrics for this target metric set or select a different metric set.
                <br />
                <br />
                <strong>Debug Info:</strong><br />
                Metric Set ID: {metricSet.id}<br />
                User Custom Metrics Settings: {metricSet.user_custom_metrics_settings?.length || 0} items<br />
                Enabled Optional Sections: {metricSet.enabled_optional_sections?.length || 0} items
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
        <CardContent className="space-y-6">
          {/* Simple metric input form - no complex sub-components for now */}
          {metricSet.user_custom_metrics_settings && metricSet.user_custom_metrics_settings.length > 0 ? (
            enabledCategories.map((category) => {
              const categoryMetrics = metricSet.user_custom_metrics_settings.filter((m: any) => m.category === category);
              
              if (categoryMetrics.length === 0) return null;
              
              return (
                <div key={category} className="space-y-4 border-t pt-6 first:border-t-0 first:pt-0">
                  <h3 className="text-lg font-semibold text-primary">{category}</h3>
                  {categoryMetrics.map((metric: any) => (
                    <div key={metric.metric_identifier} className="space-y-2">
                      <label className="text-sm font-medium">{metric.label}</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border rounded-md"
                        value={metricValues[metric.metric_identifier] || ''}
                        onChange={(e) => handleMetricValueChange(metric.metric_identifier, parseFloat(e.target.value) || 0)}
                        disabled={isSaving}
                      />
                    </div>
                  ))}
                </div>
              );
            })
          ) : (
            <div className="text-muted-foreground">No metrics configured for this metric set.</div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Metrics'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InputMetricValuesStep;
