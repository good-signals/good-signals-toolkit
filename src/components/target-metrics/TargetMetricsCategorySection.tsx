
import React from 'react';
import { Control } from 'react-hook-form';
import TargetMetricInputField from './TargetMetricInputField';
import { UserCustomMetricSetting } from '@/types/targetMetrics';

interface TargetMetricsCategorySectionProps {
  category: string;
  categoryMetrics: UserCustomMetricSetting[];
  control: Control<any>;
  errors: any;
  watch: any;
  setValue: any;
  disabled: boolean;
}

const TargetMetricsCategorySection: React.FC<TargetMetricsCategorySectionProps> = ({
  category,
  categoryMetrics,
  control,
  errors,
  watch,
  setValue,
  disabled
}) => {
  return (
    <div className="space-y-6 border-t pt-6 first:border-t-0 first:pt-0">
      <h3 className="text-lg font-semibold text-primary">{category}</h3>
      
      {/* Individual Metrics within the category */}
      {categoryMetrics.map((metricSetting, index) => (
        <TargetMetricInputField
          key={`${metricSetting.metric_identifier}-${index}`}
          metricSetting={metricSetting}
          fieldIndex={index}
          control={control}
          errors={errors}
          disabled={disabled}
        />
      ))}
    </div>
  );
};

export default TargetMetricsCategorySection;
