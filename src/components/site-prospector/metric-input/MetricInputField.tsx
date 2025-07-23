
import React from 'react';
import { Controller, Control } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { metricDropdownOptions, specificDropdownMetrics } from '@/config/metricDisplayConfig';

interface MetricInputFieldProps {
  metricField: {
    id: string;
    originalIndex: number;
    metric_identifier: string;
    label: string;
    category: string;
    entered_value: number | null;
    notes?: string | null;
    target_value?: number;
    higher_is_better?: boolean;
    measurement_type?: string | null;
  };
  control: Control<any>;
  errors: any;
  disabled: boolean;
}

const MetricInputField: React.FC<MetricInputFieldProps> = ({
  metricField,
  control,
  errors,
  disabled
}) => {
  // Debug: Log metric identifier and check if it should be a dropdown
  console.log('[MetricInputField] Metric:', metricField.metric_identifier, 'Should be dropdown:', specificDropdownMetrics.includes(metricField.metric_identifier));
  console.log('[MetricInputField] Available dropdown metrics:', specificDropdownMetrics);
  return (
    <div className="p-4 border rounded-md shadow-sm bg-card">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <Label htmlFor={`metrics.${metricField.originalIndex}.entered_value`} className="flex items-center">
            {metricField.label}
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 ml-1.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p>Target: {metricField.target_value ?? 'N/A'} ({metricField.higher_is_better ? "Higher is better" : "Lower is better"})</p>
                {metricField.measurement_type && <p>Type: {metricField.measurement_type}</p>}
              </TooltipContent>
            </Tooltip>
          </Label>
          
          {specificDropdownMetrics.includes(metricField.metric_identifier) ? (
            // DEBUG: This metric should use a dropdown
            // Metric identifier: {metricField.metric_identifier}
            <Controller
              name={`metrics.${metricField.originalIndex}.entered_value`}
              control={control}
              render={({ field: controllerField }) => (
                <Select
                  value={controllerField.value !== null && controllerField.value !== undefined ? String(controllerField.value) : ""}
                  onValueChange={(value) => controllerField.onChange(parseFloat(value))}
                  disabled={disabled}
                >
                  <SelectTrigger id={`metrics.${metricField.originalIndex}.entered_value`} className="mt-1">
                    <SelectValue placeholder={`Select value for ${metricField.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {metricDropdownOptions[metricField.metric_identifier].map(option => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          ) : (
            <Controller
              name={`metrics.${metricField.originalIndex}.entered_value`}
              control={control}
              render={({ field: controllerField }) => (
                <Input
                  {...controllerField}
                  id={`metrics.${metricField.originalIndex}.entered_value`}
                  type="number"
                  step="any"
                  placeholder={`Enter value for ${metricField.label}`}
                  className="mt-1"
                  value={controllerField.value === null || controllerField.value === undefined ? '' : String(controllerField.value)}
                  onChange={e => controllerField.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                  disabled={disabled}
                />
              )}
            />
          )}
          {errors.metrics?.[metricField.originalIndex]?.entered_value && (
            <p className="text-sm text-destructive mt-1">{errors.metrics[metricField.originalIndex]?.entered_value?.message as string}</p>
          )}
        </div>
        <div>
          <Label htmlFor={`metrics.${metricField.originalIndex}.notes`}>Notes (Optional)</Label>
          <Controller
            name={`metrics.${metricField.originalIndex}.notes`}
            control={control}
            render={({ field: controllerField }) => (
              <Textarea
                {...controllerField}
                id={`metrics.${metricField.originalIndex}.notes`}
                placeholder="Any specific observations or context..."
                className="mt-1"
                value={controllerField.value ?? ''}
                onChange={e => controllerField.onChange(e.target.value)}
                disabled={disabled}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default MetricInputField;
