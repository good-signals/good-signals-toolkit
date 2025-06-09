
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
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Target, Zap, Users, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTargetMetricSets,
  createTargetMetricSet,
  updateTargetMetricSet,
} from '@/services/targetMetrics/targetMetricSetService';
import {
  TargetMetricsFormSchema,
  type TargetMetricsFormData,
  PREDEFINED_METRIC_CATEGORIES,
  VISITOR_PROFILE_CATEGORY,
} from '@/types/targetMetrics';
import { getAccountForUser } from '@/services/targetMetrics/accountHelpers';
import CategorySection from '@/components/site-prospector/metric-input/CategorySection';

const TargetMetricsBuilderPage = () => {
  const { id } = useParams();
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
  const { data: existingMetricSet, isLoading: isLoadingMetricSet } = useQuery({
    queryKey: ['targetMetricSet', id],
    queryFn: async () => {
      if (!id || !user?.id) return null;
      const metricSets = await getTargetMetricSets(user.id);
      return metricSets.find(set => set.id === id) || null;
    },
    enabled: !!id && !!user?.id,
  });

  // Populate form when editing
  useEffect(() => {
    if (existingMetricSet) {
      form.setValue('metric_set_name', existingMetricSet.name);
      form.setValue('metric_set_id', existingMetricSet.id);
      
      // Reset arrays first
      form.setValue('predefined_metrics', []);
      form.setValue('custom_metrics', []);
      form.setValue('visitor_profile_metrics', []);
      
      // Populate metrics if they exist
      if (existingMetricSet.user_custom_metrics_settings) {
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
                measurement_type: (setting.measurement_type as "Index" | "Amount") || "Index",
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
      }
    }
  }, [existingMetricSet, form]);

  // Save/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: TargetMetricsFormData) => {
      if (!user?.id || !accountId) {
        throw new Error('User not authenticated or account not found');
      }

      if (id) {
        return await updateTargetMetricSet(id, data, user.id, accountId);
      } else {
        return await createTargetMetricSet(data, user.id, accountId);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Target metric set ${id ? 'updated' : 'created'} successfully!`,
      });
      queryClient.invalidateQueries({ queryKey: ['targetMetricSets'] });
      navigate('/target-metrics');
    },
    onError: (error: Error) => {
      console.error('Error saving target metrics:', error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${id ? 'update' : 'create'} target metric set`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TargetMetricsFormData) => {
    console.log('Submitting form data:', data);
    saveMutation.mutate(data);
  };

  if (isLoadingMetricSet) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="mb-8">
        <Button variant="ghost" onClick={() => navigate('/target-metrics')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Target Metrics
        </Button>
        <h1 className="text-3xl font-bold text-primary mt-4">
          {id ? 'Edit' : 'Create'} Target Metric Set
        </h1>
        <p className="text-muted-foreground">
          Define the target values for metrics that will be used to evaluate sites.
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
                  {PREDEFINED_METRIC_CATEGORIES.map((category) => (
                    <CategorySection
                      key={category}
                      category={category}
                      control={form.control}
                      watch={form.watch}
                      setValue={form.setValue}
                      metricType="predefined"
                    />
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="visitor-profile" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Visitor Profile Metrics</CardTitle>
                  <CardDescription>
                    Define target demographics and visitor characteristics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CategorySection
                    category={VISITOR_PROFILE_CATEGORY}
                    control={form.control}
                    watch={form.watch}
                    setValue={form.setValue}
                    metricType="visitor_profile"
                  />
                </CardContent>
              </Card>
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
              onClick={() => navigate('/target-metrics')}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saveMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? 'Saving...' : (id ? 'Update' : 'Create') + ' Metric Set'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default TargetMetricsBuilderPage;
