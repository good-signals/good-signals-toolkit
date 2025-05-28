
import React from 'react';
import { Controller, Control } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import SiteVisitRatingField from './SiteVisitRatingField';
import ImageUploadField from '../ImageUploadField';

interface SiteVisitSectionProps {
  siteVisitRatingFields: Array<{
    id: string;
    criterion_key: string;
    grade: string;
    notes: string;
  }>;
  siteVisitImageMetricIndex?: number;
  control: Control<any>;
  watch: any;
  setValue: any;
  disabled: boolean;
}

const SiteVisitSection: React.FC<SiteVisitSectionProps> = ({
  siteVisitRatingFields,
  siteVisitImageMetricIndex,
  control,
  watch,
  setValue,
  disabled
}) => {
  if (siteVisitRatingFields.length === 0) return null;

  return (
    <div className="space-y-6 border-t pt-6 mt-8">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-primary">Site Visit Ratings</h3>
      </div>
      
      {/* Individual Site Visit Criteria */}
      {siteVisitRatingFields.map((field, index) => (
        <SiteVisitRatingField
          key={field.id}
          field={field}
          index={index}
          control={control}
          disabled={disabled}
        />
      ))}

      {/* Site Visit Section Image Upload */}
      {siteVisitImageMetricIndex !== undefined && (
        <div className="p-4 border rounded-md shadow-sm bg-secondary/30 mt-6">
          <Label htmlFor={`metrics.${siteVisitImageMetricIndex}.image`}>Optional Image for Site Visit Section</Label>
          <Controller
            name={`metrics.${siteVisitImageMetricIndex}.image_file` as any}
            control={control}
            render={() => (
              <ImageUploadField
                id={`metrics.${siteVisitImageMetricIndex}.image`}
                currentImageUrl={watch(`metrics.${siteVisitImageMetricIndex}.image_url` as any)}
                onFileChange={(file) => {
                  setValue(`metrics.${siteVisitImageMetricIndex}.image_file` as any, file, { shouldValidate: true });
                  if (!file && watch(`metrics.${siteVisitImageMetricIndex}.image_url` as any)) {
                    setValue(`metrics.${siteVisitImageMetricIndex}.image_url` as any, null, { shouldValidate: true });
                  }
                }}
                onRemoveCurrentImage={() => {
                  setValue(`metrics.${siteVisitImageMetricIndex}.image_url` as any, null, { shouldValidate: true });
                  setValue(`metrics.${siteVisitImageMetricIndex}.image_file` as any, null, { shouldValidate: true });
                }}
                disabled={disabled}
              />
            )}
          />
        </div>
      )}
    </div>
  );
};

export default SiteVisitSection;
