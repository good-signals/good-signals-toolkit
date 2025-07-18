
import React from 'react';
import { Control } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCustomMetricSetting } from '@/types/targetMetrics';
import { metricDropdownOptions, specificDropdownMetrics } from '@/config/metricDisplayConfig';

interface TargetMetricInputFieldProps {
  metricSetting: UserCustomMetricSetting;
  fieldIndex: number;
  control: Control<any>;
  errors: any;
  disabled: boolean;
}

const TargetMetricInputField: React.FC<TargetMetricInputFieldProps> = ({
  metricSetting,
  fieldIndex,
  control,
  errors,
  disabled
}) => {
  const isDropdownMetric = specificDropdownMetrics.includes(metricSetting.metric_identifier);
  const dropdownOptions = metricDropdownOptions[metricSetting.metric_identifier] || [];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg bg-card">
      <div className="sm:w-2/3 mb-2 sm:mb-0">
        <FormLabel className="text-base font-medium">{metricSetting.label}</FormLabel>
        <div className="text-sm text-muted-foreground mt-1">
          Category: {metricSetting.category}
          {metricSetting.measurement_type && ` • Type: ${metricSetting.measurement_type}`}
          <br />
          {metricSetting.higher_is_better ? "(Higher is better)" : "(Lower is better)"}
        </div>
      </div>
      
      <div className="sm:w-1/3">
        <FormField
          control={control}
          name={`predefined_metrics.${fieldIndex}.target_value`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                {isDropdownMetric ? (
                  <Select
                    onValueChange={(value) => field.onChange(parseFloat(value))}
                    value={String(field.value || '')}
                    disabled={disabled}
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
                    disabled={disabled}
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
};

export default TargetMetricInputField;
