
import React from 'react';
import { Badge } from '@/components/ui/badge';
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

  const getTargetValue = () => {
    if (metricField.target_value === null || metricField.target_value === undefined) {
      return "N/A";
    }
    return String(metricField.target_value);
  };

  const getSignalScore = () => {
    if (metricField.entered_value === null || metricField.entered_value === undefined || 
        metricField.target_value === null || metricField.target_value === undefined) {
      return null;
    }

    const enteredValue = metricField.entered_value;
    const targetValue = metricField.target_value;
    const higherIsBetter = metricField.higher_is_better ?? true;

    let score: number;
    if (higherIsBetter) {
      score = enteredValue >= targetValue ? 100 : Math.round((enteredValue / targetValue) * 100);
    } else {
      score = enteredValue <= targetValue ? 100 : Math.round((targetValue / enteredValue) * 100);
    }

    return Math.max(0, Math.min(100, score));
  };

  const getSignalScoreColor = (score: number | null) => {
    if (score === null) return "secondary";
    if (score >= 80) return "success";
    if (score >= 60) return "default";
    return "destructive";
  };

  const signalScore = getSignalScore();

  return (
    <div className="grid grid-cols-5 gap-4 py-3 border-b border-border last:border-b-0">
      {/* Metric Name */}
      <div className="font-medium text-foreground">
        {metricField.label}
      </div>

      {/* Entered Value */}
      <div className="text-foreground">
        {getDisplayValue()}
      </div>

      {/* Target Value */}
      <div className="text-foreground">
        {getTargetValue()}
      </div>

      {/* Signal Score */}
      <div>
        {signalScore !== null ? (
          <Badge variant={getSignalScoreColor(signalScore)} className="text-sm">
            {signalScore}%
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">N/A</span>
        )}
      </div>

      {/* Notes */}
      <div className="text-muted-foreground text-sm">
        {metricField.notes || "-"}
      </div>
    </div>
  );
};

export default MetricDisplayField;
