
import React, { useState } from 'react';
import { useFieldArray, Control } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { TargetMetricsFormData, VISITOR_PROFILE_CATEGORY } from '@/types/targetMetrics';
import VisitorProfileMetricForm from './VisitorProfileMetricForm';

interface VisitorProfileMetricsSectionProps {
  control: Control<TargetMetricsFormData>;
}

const VisitorProfileMetricsSection: React.FC<VisitorProfileMetricsSectionProps> = ({
  control,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const { fields, append, update, remove } = useFieldArray({
    control,
    name: "visitor_profile_metrics",
  });

  const handleAddMetric = (data: any) => {
    const newMetric = {
      metric_identifier: `visitor_profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      label: data.label,
      category: VISITOR_PROFILE_CATEGORY,
      target_value: data.target_value,
      measurement_type: data.measurement_type,
      higher_is_better: data.higher_is_better,
    };
    append(newMetric);
    setIsFormOpen(false);
  };

  const handleEditMetric = (index: number, data: any) => {
    const updatedMetric = {
      ...fields[index],
      label: data.label,
      target_value: data.target_value,
      measurement_type: data.measurement_type,
      higher_is_better: data.higher_is_better,
    };
    update(index, updatedMetric);
    setEditingIndex(null);
    setIsFormOpen(false);
  };

  const handleDeleteMetric = (index: number) => {
    remove(index);
  };

  const startEditingMetric = (index: number) => {
    setEditingIndex(index);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingIndex(null);
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingIndex(null);
    setIsFormOpen(true);
  };

  const editingMetric = editingIndex !== null ? fields[editingIndex] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visitor Profile Metrics</CardTitle>
        <CardDescription>
          Define custom metrics for tracking visitor demographics and characteristics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-medium">Your Visitor Profile Metrics</h4>
          <Button type="button" onClick={handleAddClick} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Metric
          </Button>
        </div>

        {fields.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No visitor profile metrics defined yet.</p>
            <p className="text-sm">Click "Add Metric" to create your first visitor profile metric.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card"
              >
                <div className="flex-1">
                  <div className="font-medium">{field.label}</div>
                  <div className="text-sm text-muted-foreground">
                    Target: {field.target_value} ({field.measurement_type}) • 
                    {field.higher_is_better ? ' Higher is better' : ' Lower is better'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      startEditingMetric(index);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteMetric(index);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <VisitorProfileMetricForm
          open={isFormOpen}
          onOpenChange={handleFormClose}
          onSubmit={editingIndex !== null ? (data) => handleEditMetric(editingIndex, data) : handleAddMetric}
          initialData={editingMetric || undefined}
          isEditing={editingIndex !== null}
        />
      </CardContent>
    </Card>
  );
};

export default VisitorProfileMetricsSection;
