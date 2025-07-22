
import React, { useState, useEffect } from 'react';
import { Control, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Zap } from 'lucide-react';
import { TargetMetricsFormData } from '@/types/targetMetrics';
import CustomMetricForm from './CustomMetricForm';
import { saveIndividualMetric, updateIndividualMetric, deleteIndividualMetric, getMetricsForSet } from '@/services/targetMetrics/individualMetricService';
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/hooks/use-toast';

interface CustomMetricsSectionProps {
  control: Control<TargetMetricsFormData>;
  metricSetId?: string;
}

const CustomMetricsSection: React.FC<CustomMetricsSectionProps> = ({ 
  control, 
  metricSetId 
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();
  const { toast } = useToast();

  const { fields, append, update, remove, replace } = useFieldArray({
    control,
    name: 'custom_metrics',
  });

  // Load metrics from database when component mounts or metricSetId changes
  useEffect(() => {
    if (metricSetId && user?.id) {
      loadMetricsFromDatabase();
    }
  }, [metricSetId, user?.id]);

  const loadMetricsFromDatabase = async () => {
    if (!metricSetId || !user?.id) return;
    
    try {
      setIsLoading(true);
      const metrics = await getMetricsForSet(user.id, metricSetId);
      const customMetrics = metrics
        .filter(metric => metric.category !== 'Visitor Profile')
        .filter(metric => metric.metric_identifier.startsWith('custom_'))
        .map(metric => ({
          metric_identifier: metric.metric_identifier,
          label: metric.label,
          category: metric.category,
          target_value: metric.target_value,
          higher_is_better: metric.higher_is_better,
          units: metric.measurement_type,
          is_custom: true as const,
          id: metric.id // Store the database ID for updates/deletes
        }));
      
      replace(customMetrics);
    } catch (error) {
      console.error('Error loading custom metrics:', error);
      toast({
        title: "Error",
        description: "Failed to load custom metrics",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMetric = async (data: any) => {
    if (!metricSetId || !user?.id) {
      // If no metricSetId, just add to form (draft mode)
      const newMetric = {
        metric_identifier: `custom_${Date.now()}`,
        label: data.name,
        category: data.category,
        target_value: data.target_value,
        higher_is_better: data.higher_is_better,
        units: data.units,
        is_custom: true as const,
      };
      append(newMetric);
      setIsFormOpen(false);
      return;
    }

    try {
      setIsLoading(true);
      const metricData = {
        metric_identifier: `custom_${Date.now()}`,
        label: data.name,
        category: data.category,
        target_value: data.target_value,
        higher_is_better: data.higher_is_better,
        units: data.units,
      };

      const savedMetric = await saveIndividualMetric(user.id, metricSetId, metricData);
      
      // Add to form with database ID
      append({
        ...metricData,
        is_custom: true as const,
        id: savedMetric.id
      });

      toast({
        title: "Success",
        description: "Custom metric added successfully"
      });
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error adding custom metric:', error);
      toast({
        title: "Error",
        description: "Failed to add custom metric",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditMetric = async (data: any) => {
    if (editingIndex === null) return;
    
    const existingMetric = fields[editingIndex];
    
    if (!metricSetId || !user?.id || !existingMetric.id) {
      // If no metricSetId or database ID, just update form (draft mode)
      const updatedMetric = {
        ...existingMetric,
        label: data.name,
        category: data.category,
        target_value: data.target_value,
        higher_is_better: data.higher_is_better,
        units: data.units,
      };
      update(editingIndex, updatedMetric);
      setEditingIndex(null);
      setIsFormOpen(false);
      return;
    }

    try {
      setIsLoading(true);
      await updateIndividualMetric(user.id, existingMetric.id, {
        label: data.name,
        category: data.category,
        target_value: data.target_value,
        higher_is_better: data.higher_is_better,
        units: data.units,
      });

      // Update form
      const updatedMetric = {
        ...existingMetric,
        label: data.name,
        category: data.category,
        target_value: data.target_value,
        higher_is_better: data.higher_is_better,
        units: data.units,
      };
      update(editingIndex, updatedMetric);

      toast({
        title: "Success",
        description: "Custom metric updated successfully"
      });
      setEditingIndex(null);
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error updating custom metric:', error);
      toast({
        title: "Error",
        description: "Failed to update custom metric",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (data: any) => {
    if (editingIndex !== null) {
      handleEditMetric(data);
    } else {
      handleAddMetric(data);
    }
  };

  const openEditForm = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingIndex(index);
    setIsFormOpen(true);
  };

  const openAddForm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingIndex(null);
    setIsFormOpen(true);
  };

  const handleRemoveMetric = async (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const existingMetric = fields[index];
    
    if (!metricSetId || !user?.id || !existingMetric.id) {
      // If no metricSetId or database ID, just remove from form (draft mode)
      console.log('Removing custom metric at index:', index);
      remove(index);
      return;
    }

    try {
      setIsLoading(true);
      await deleteIndividualMetric(user.id, existingMetric.id);
      
      // Remove from form
      console.log('Removing custom metric at index:', index);
      remove(index);

      toast({
        title: "Success",
        description: "Custom metric deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting custom metric:', error);
      toast({
        title: "Error",
        description: "Failed to delete custom metric",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getInitialData = () => {
    if (editingIndex === null) return undefined;
    
    const metric = fields[editingIndex];
    return {
      name: metric.label,
      category: metric.category,
      target_value: metric.target_value,
      higher_is_better: metric.higher_is_better,
      units: metric.units,
    };
  };

  // Group metrics by category
  const groupedMetrics = fields.reduce((acc, field, index) => {
    const category = field.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({ ...field, index });
    return acc;
  }, {} as Record<string, Array<typeof fields[0] & { index: number }>>);

  const categories = Object.keys(groupedMetrics).sort();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Custom Metrics
        </CardTitle>
        <CardDescription>
          Add custom metrics specific to your business needs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {fields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No custom metrics yet</p>
              <p className="text-sm mb-4">
                Create custom metrics to track business-specific KPIs
              </p>
              <Button 
                type="button" 
                onClick={openAddForm}
                disabled={isLoading}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Custom Metric
              </Button>
            </div>
          ) : (
            <>
              {/* Render metrics grouped by category */}
              {categories.map((category) => (
                <div key={category} className="space-y-4 border-t pt-6 first:border-t-0 first:pt-0">
                  <h3 className="text-lg font-semibold text-primary">{category}</h3>
                  <div className="grid gap-3">
                    {groupedMetrics[category].map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{field.label}</span>
                            {field.units && (
                              <Badge variant="secondary" className="text-xs">
                                {field.units}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Target: {field.target_value} 
                            {field.higher_is_better ? ' (higher is better)' : ' (lower is better)'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => openEditForm(e, field.index)}
                            disabled={isLoading}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleRemoveMetric(e, field.index)}
                            disabled={isLoading}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={openAddForm} 
                className="w-full"
                disabled={isLoading}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Another Custom Metric
              </Button>
            </>
          )}
        </div>

        <CustomMetricForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSubmit={handleSubmit}
          initialData={getInitialData()}
          isEditing={editingIndex !== null}
        />
      </CardContent>
    </Card>
  );
};

export default CustomMetricsSection;
