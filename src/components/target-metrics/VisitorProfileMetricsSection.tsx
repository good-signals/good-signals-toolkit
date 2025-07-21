
import React, { useState, useEffect } from 'react';
import { useFieldArray, Control } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TargetMetricsFormData, VISITOR_PROFILE_CATEGORY } from '@/types/targetMetrics';
import VisitorProfileMetricForm from './VisitorProfileMetricForm';
import { saveIndividualMetric, updateIndividualMetric, deleteIndividualMetric, getMetricsForSet } from '@/services/targetMetrics/individualMetricService';
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/hooks/use-toast';

interface VisitorProfileMetricsSectionProps {
  control: Control<TargetMetricsFormData>;
  metricSetId?: string;
  isEnabled?: boolean;
  onToggleEnabled?: (enabled: boolean) => void;
}

const VisitorProfileMetricsSection: React.FC<VisitorProfileMetricsSectionProps> = ({
  control,
  metricSetId,
  isEnabled = true,
  onToggleEnabled,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const { user } = useUser();
  const { toast } = useToast();

  const { fields, append, update, remove, replace } = useFieldArray({
    control,
    name: "visitor_profile_metrics",
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
      const visitorProfileMetrics = metrics
        .filter(metric => metric.category === VISITOR_PROFILE_CATEGORY)
        .map(metric => ({
          metric_identifier: metric.metric_identifier,
          label: metric.label,
          category: VISITOR_PROFILE_CATEGORY,
          target_value: metric.target_value,
          measurement_type: (metric.measurement_type as "Index" | "Amount" | "Percentage") || "Index",
          higher_is_better: metric.higher_is_better,
          id: metric.id // Store the database ID for updates/deletes
        }));
      
      replace(visitorProfileMetrics);
    } catch (error) {
      console.error('Error loading visitor profile metrics:', error);
      toast({
        title: "Error",
        description: "Failed to load visitor profile metrics",
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
        metric_identifier: `visitor_profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        label: data.label,
        category: VISITOR_PROFILE_CATEGORY,
        target_value: data.target_value,
        measurement_type: data.measurement_type as "Index" | "Amount" | "Percentage",
        higher_is_better: data.higher_is_better,
      };
      append(newMetric);
      setIsFormOpen(false);
      return;
    }

    try {
      setIsLoading(true);
      const metricData = {
        metric_identifier: `visitor_profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        label: data.label,
        category: VISITOR_PROFILE_CATEGORY,
        target_value: data.target_value,
        measurement_type: data.measurement_type,
        higher_is_better: data.higher_is_better,
      };

      const savedMetric = await saveIndividualMetric(user.id, metricSetId, metricData);
      
      // Add to form with database ID
      append({
        ...metricData,
        category: VISITOR_PROFILE_CATEGORY,
        measurement_type: data.measurement_type as "Index" | "Amount" | "Percentage",
        id: savedMetric.id
      });

      toast({
        title: "Success",
        description: "Visitor profile metric added successfully"
      });
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error adding visitor profile metric:', error);
      toast({
        title: "Error",
        description: "Failed to add visitor profile metric",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditMetric = async (index: number, data: any) => {
    const existingMetric = fields[index];
    
    if (!metricSetId || !user?.id || !existingMetric.id) {
      // If no metricSetId or database ID, just update form (draft mode)
      const updatedMetric = {
        ...existingMetric,
        label: data.label,
        target_value: data.target_value,
        measurement_type: data.measurement_type as "Index" | "Amount" | "Percentage",
        higher_is_better: data.higher_is_better,
      };
      update(index, updatedMetric);
      setEditingIndex(null);
      setIsFormOpen(false);
      return;
    }

    try {
      setIsLoading(true);
      await updateIndividualMetric(user.id, existingMetric.id, {
        label: data.label,
        target_value: data.target_value,
        measurement_type: data.measurement_type,
        higher_is_better: data.higher_is_better,
      });

      // Update form
      const updatedMetric = {
        ...existingMetric,
        label: data.label,
        target_value: data.target_value,
        measurement_type: data.measurement_type as "Index" | "Amount" | "Percentage",
        higher_is_better: data.higher_is_better,
      };
      update(index, updatedMetric);

      toast({
        title: "Success",
        description: "Visitor profile metric updated successfully"
      });
      setEditingIndex(null);
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error updating visitor profile metric:', error);
      toast({
        title: "Error",
        description: "Failed to update visitor profile metric",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMetric = async (index: number) => {
    const existingMetric = fields[index];
    
    if (!metricSetId || !user?.id || !existingMetric.id) {
      // If no metricSetId or database ID, just remove from form (draft mode)
      remove(index);
      return;
    }

    try {
      setIsLoading(true);
      await deleteIndividualMetric(user.id, existingMetric.id);
      
      // Remove from form
      remove(index);

      toast({
        title: "Success",
        description: "Visitor profile metric deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting visitor profile metric:', error);
      toast({
        title: "Error",
        description: "Failed to delete visitor profile metric",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
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
    <Card className={!isEnabled ? "opacity-60" : ""}>
      <Collapsible open={isEnabled && isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isEnabled && (isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
                {!isEnabled && <ChevronRight className="h-4 w-4 opacity-50" />}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Visitor Profile Metrics</span>
                    <Badge variant="secondary" className="text-xs">
                      Optional
                    </Badge>
                    {fields.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {fields.length} metric{fields.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onToggleEnabled && (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={onToggleEnabled}
                    />
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium">Your Visitor Profile Metrics</h4>
              <Button 
                type="button" 
                onClick={handleAddClick} 
                size="sm"
                disabled={isLoading || !isEnabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Metric
              </Button>
            </div>

            {(!fields || fields.length === 0) ? (
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
                        disabled={isLoading || !isEnabled}
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
                        disabled={isLoading || !isEnabled}
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
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default VisitorProfileMetricsSection;
