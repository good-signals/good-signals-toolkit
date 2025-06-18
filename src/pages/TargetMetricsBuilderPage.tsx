import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Target, Zap, Users, Building2 } from 'lucide-react';
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
  PREDEFINED_METRIC_CATEGORIES,
  VISITOR_PROFILE_CATEGORY,
} from '@/types/targetMetrics';
import { getAccountForUser } from '@/services/targetMetrics/accountHelpers';
import TargetMetricsCategorySection from '@/components/target-metrics/TargetMetricsCategorySection';
import VisitorProfileMetricsSection from '@/components/target-metrics/VisitorProfileMetricsSection';

const TargetMetricsBuilderPage = () => {
  const { metricSetId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [accountId, setAccountId] = useState<string | null>(null);

  const form = useForm<TargetMetricsFormData>({
    resolver: zodResolver(TargetMetricsFormSchema),
    defaultValues: {
      metric_set_name: '',
      predefined_metrics: [],
      custom_metrics: [],
      visitor_profile_metrics: [],
    },
  });

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
              },
            ]);
          } else {
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
      } else {
        console.warn('[TargetMetricsBuilderPage] No user_custom_metrics_settings found for metric set. This may indicate a data integrity issue.');
      }
    }
  }, [existingMetricSet, form]);

  // Save/Update mutation with assessment recalculation
  const saveMutation = useMutation({
    mutationFn: async (data: TargetMetricsFormData) => {
      if (!user?.id || !accountId) {
        throw new Error('User not authenticated or account not found');
      }

      let result;
      if (metricSetId) {
        console.log('[TargetMetricsBuilderPage] Updating metric set:', metricSetId);
        result = await updateTargetMetricSet(metricSetId, data, user.id, accountId);
      } else {
        console.log('[TargetMetricsBuilderPage] Creating new metric set');
        result = await createTargetMetricSet(data, user.id, accountId);
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

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="mb-8">
        <Button variant="ghost" onClick={() => navigate('/target-metric-sets')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Target Metric Sets
        </Button>
        <h1 className="text-3xl font-bold text-primary mt-4">
          {metricSetId ? 'Edit' : 'Create'} Target Metric Set
        </h1>
        <p className="text-muted-foreground">
          Define the target values for metrics that will be used to evaluate sites.
          {metricSetId && ' Changes will automatically recalculate scores for all related site assessments.'}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Set a name for your target metric set
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="metric_set_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Metric Set Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Retail Site Standards" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Tabs defaultValue="predefined" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="predefined" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Predefined Metrics
              </TabsTrigger>
              <TabsTrigger value="visitor-profile" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Visitor Profile
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Custom Metrics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="predefined" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Predefined Metrics</CardTitle>
                  <CardDescription>
                    Set target values for standard business metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {PREDEFINED_METRIC_CATEGORIES.map((category) => {
                    const categoryMetrics = existingMetricSet?.user_custom_metrics_settings?.filter(
                      setting => setting.category === category
                    ) || [];
                    
                    return (
                      <TargetMetricsCategorySection
                        key={category}
                        category={category}
                        categoryMetrics={categoryMetrics}
                        control={form.control}
                        errors={{}}
                        watch={form.watch}
                        setValue={form.setValue}
                        disabled={false}
                      />
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="visitor-profile" className="space-y-4">
              <VisitorProfileMetricsSection
                control={form.control}
              />
            </TabsContent>

            <TabsContent value="custom" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Custom Metrics</CardTitle>
                  <CardDescription>
                    Add custom metrics specific to your business needs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    Custom metrics functionality coming soon...
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/target-metric-sets')}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saveMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? 'Saving...' : (metricSetId ? 'Update' : 'Create') + ' Metric Set'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default TargetMetricsBuilderPage;
