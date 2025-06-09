
import React from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { metricDropdownOptions, specificDropdownMetrics } from '@/config/metricDisplayConfig';

interface MetricDisplayFieldProps {
  metricField: {
    id: string;
    metric_identifier: string;
    label: string;
    category: string;
    entered_value: number | null;
    notes?: string | null;
    target_value?: number;
    higher_is_better?: boolean;
    measurement_type?: string | null;
  };
}

const MetricDisplayField: React.FC<MetricDisplayFieldProps> = ({
  metricField,
}) => {
  const getDisplayValue = () => {
    if (metricField.entered_value === null || metricField.entered_value === undefined) {
      return "No value entered";
    }

    // Check if this is a dropdown metric
    if (specificDropdownMetrics.includes(metricField.metric_identifier)) {
      const options = metricDropdownOptions[metricField.metric_identifier];
      const option = options?.find(opt => opt.value === metricField.entered_value);
      return option ? option.label : String(metricField.entered_value);
    }

    return String(metricField.entered_value);
  };

  return (
    <div className="p-4 border rounded-md shadow-sm bg-card">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <Label className="flex items-center text-sm font-medium">
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
          
          <div className="mt-1 p-2 bg-muted rounded-md">
            <span className="text-sm font-medium">
              {getDisplayValue()}
            </span>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Notes</Label>
          <div className="mt-1 p-2 bg-muted rounded-md min-h-[2.5rem]">
            <span className="text-sm text-muted-foreground">
              {metricField.notes || "No notes provided"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricDisplayField;
