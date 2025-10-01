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

  const hasError = errors?.predefined_metrics?.[fieldIndex]?.target_value;
  const isEmpty = !metricSetting.target_value || metricSetting.target_value === 0;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg bg-card ${hasError ? 'border-destructive' : isEmpty ? 'border-warning' : ''}`}>
      <div className="sm:w-2/3 mb-2 sm:mb-0">
        <FormLabel className="text-base font-medium">
          {metricSetting.label}
          {isEmpty && !disabled && <span className="text-warning ml-1">*</span>}
        </FormLabel>
        <div className="text-sm text-muted-foreground mt-1">
          Category: {metricSetting.category}
          {metricSetting.measurement_type && ` • Type: ${metricSetting.measurement_type}`}
          <br />
          {metricSetting.higher_is_better ? "(Higher is better)" : "(Lower is better)"}
          {isEmpty && !disabled && <span className="block text-warning text-xs mt-1">Target value required</span>}
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
                    onChange={e => {
                      const value = e.target.value;
                      // Handle empty string as undefined
                      if (value === '') {
                        field.onChange(undefined);
                        return;
                      }
                      // Parse the number - if valid, set it, otherwise keep undefined
                      const parsed = parseFloat(value);
                      field.onChange(!isNaN(parsed) ? parsed : undefined);
                    }}
                    disabled={disabled}
                    className={!field.value ? "border-warning" : ""}
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
