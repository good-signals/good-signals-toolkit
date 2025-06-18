
import React, { useState } from 'react';
import { Control, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Zap } from 'lucide-react';
import { TargetMetricsFormData } from '@/types/targetMetrics';
import CustomMetricForm from './CustomMetricForm';

interface CustomMetricsSectionProps {
  control: Control<TargetMetricsFormData>;
}

const CustomMetricsSection: React.FC<CustomMetricsSectionProps> = ({ control }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const { fields, append, update, remove } = useFieldArray({
    control,
    name: 'custom_metrics',
  });

  const handleAddMetric = (data: any) => {
    const newMetric = {
      metric_identifier: `custom_${Date.now()}`,
      label: data.name,
      category: data.category,
      target_value: data.target_value,
      higher_is_better: data.higher_is_better,
      units: data.units,
      is_custom: true as const,
    };

    console.log('Adding custom metric:', newMetric);
    append(newMetric);
    setIsFormOpen(false);
  };

  const handleEditMetric = (data: any) => {
    if (editingIndex === null) return;

    const updatedMetric = {
      ...fields[editingIndex],
      label: data.name,
      category: data.category,
      target_value: data.target_value,
      higher_is_better: data.higher_is_better,
      units: data.units,
    };

    console.log('Updating custom metric:', updatedMetric);
    update(editingIndex, updatedMetric);
    setEditingIndex(null);
    setIsFormOpen(false);
  };

  const handleSubmit = (data: any) => {
    if (editingIndex !== null) {
      handleEditMetric(data);
    } else {
      handleAddMetric(data);
    }
  };

  const openEditForm = (index: number) => {
    setEditingIndex(index);
    setIsFormOpen(true);
  };

  const openAddForm = () => {
    setEditingIndex(null);
    setIsFormOpen(true);
  };

  const handleRemoveMetric = (index: number) => {
    console.log('Removing custom metric at index:', index);
    remove(index);
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
        <div className="space-y-4">
          {fields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No custom metrics yet</p>
              <p className="text-sm mb-4">
                Create custom metrics to track business-specific KPIs
              </p>
              <Button onClick={openAddForm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Custom Metric
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-3">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{field.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {field.category}
                        </Badge>
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
                        onClick={() => openEditForm(index)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveMetric(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" onClick={openAddForm} className="w-full">
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
