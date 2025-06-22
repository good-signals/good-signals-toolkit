
import React from 'react';
import { Control, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TargetMetricsFormData } from '@/types/targetMetrics';
import { sortCategoriesByOrder } from '@/config/targetMetricsConfig';
import { metricDropdownOptions, specificDropdownMetrics } from '@/config/metricDisplayConfig';

interface PredefinedMetricsSectionProps {
  control: Control<TargetMetricsFormData>;
}

const PredefinedMetricsSection: React.FC<PredefinedMetricsSectionProps> = ({
  control,
}) => {
  const { fields } = useFieldArray({
    control,
    name: "predefined_metrics",
  });

  // Group metrics by category
  const metricsByCategory = fields.reduce((acc, metric, index) => {
    const category = metric.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({ ...metric, index });
    return acc;
  }, {} as Record<string, Array<any>>);

  const sortedCategories = sortCategoriesByOrder(Object.keys(metricsByCategory));

  if (fields.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Target Metrics</CardTitle>
          <CardDescription>
            No predefined metrics are configured for this metric set
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>This metric set doesn't have any predefined metrics configured.</p>
            <p className="text-sm">Predefined metrics are typically imported when creating a new metric set.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Target Metrics</CardTitle>
        <CardDescription>
          Set your target values for each metric category
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {sortedCategories.map((category) => (
          <div key={category} className="space-y-4">
            <h3 className="text-lg font-semibold text-primary border-b pb-2">
              {category}
            </h3>
            
            <div className="space-y-4">
              {metricsByCategory[category].map((metric) => {
                const isDropdownMetric = specificDropdownMetrics.includes(metric.metric_identifier);
                const dropdownOptions = metricDropdownOptions[metric.metric_identifier] || [];

                return (
                  <div
                    key={metric.metric_identifier}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg bg-card"
                  >
                    <div className="sm:w-2/3 mb-2 sm:mb-0">
                      <FormLabel className="text-base font-medium">
                        {metric.label}
                      </FormLabel>
                      <div className="text-sm text-muted-foreground mt-1">
                        {metric.higher_is_better ? "(Higher is better)" : "(Lower is better)"}
                      </div>
                    </div>
                    
                    <div className="sm:w-1/3">
                      <FormField
                        control={control}
                        name={`predefined_metrics.${metric.index}.target_value`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              {isDropdownMetric ? (
                                <Select
                                  onValueChange={(value) => field.onChange(parseFloat(value))}
                                  value={String(field.value || '')}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select target" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {dropdownOptions.map(option => (
                                      <SelectItem key={option.value} value={String(option.value)}>
                                        {option.label} ({option.value})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  type="number"
                                  placeholder="Enter target value"
                                  {...field}
                                  onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              )}
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PredefinedMetricsSection;
