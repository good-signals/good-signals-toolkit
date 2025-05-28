
import React from 'react';
import { Control } from 'react-hook-form';
import MetricInputField from './MetricInputField';
import CategoryImageUpload from './CategoryImageUpload';

interface CategorySectionProps {
  category: string;
  categoryMetrics: Array<{
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
  }>;
  imageMetricIndex?: number;
  control: Control<any>;
  errors: any;
  watch: any;
  setValue: any;
  disabled: boolean;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  categoryMetrics,
  imageMetricIndex,
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
      {categoryMetrics.map((metricField) => (
        <MetricInputField
          key={metricField.id}
          metricField={metricField}
          control={control}
          errors={errors}
          disabled={disabled}
        />
      ))}

      {/* Category Image Upload Field */}
      {imageMetricIndex !== undefined && (
        <CategoryImageUpload
          category={category}
          imageMetricIndex={imageMetricIndex}
          control={control}
          watch={watch}
          setValue={setValue}
          disabled={disabled}
        />
      )}
    </div>
  );
};

export default CategorySection;
