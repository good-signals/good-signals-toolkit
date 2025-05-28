
import React from 'react';
import { Controller, Control } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import ImageUploadField from '../ImageUploadField';

interface CategoryImageUploadProps {
  category: string;
  imageMetricIndex: number;
  control: Control<any>;
  watch: any;
  setValue: any;
  disabled: boolean;
}

const CategoryImageUpload: React.FC<CategoryImageUploadProps> = ({
  category,
  imageMetricIndex,
  control,
  watch,
  setValue,
  disabled
}) => {
  return (
    <div className="p-4 border rounded-md shadow-sm bg-secondary/30 mt-6">
      <Label htmlFor={`metrics.${imageMetricIndex}.image`}>{`Optional Image for ${category} Section`}</Label>
      <Controller
        name={`metrics.${imageMetricIndex}.image_file` as any}
        control={control}
        render={() => (
          <ImageUploadField
            id={`metrics.${imageMetricIndex}.image`}
            currentImageUrl={watch(`metrics.${imageMetricIndex}.image_url` as any)}
            onFileChange={(file) => {
              setValue(`metrics.${imageMetricIndex}.image_file` as any, file, { shouldValidate: true });
              if (!file && watch(`metrics.${imageMetricIndex}.image_url` as any)) {
                setValue(`metrics.${imageMetricIndex}.image_url` as any, null, { shouldValidate: true });
              }
            }}
            onRemoveCurrentImage={() => {
              setValue(`metrics.${imageMetricIndex}.image_url` as any, null, { shouldValidate: true });
              setValue(`metrics.${imageMetricIndex}.image_file` as any, null, { shouldValidate: true });
            }}
            disabled={disabled}
          />
        )}
      />
    </div>
  );
};

export default CategoryImageUpload;
