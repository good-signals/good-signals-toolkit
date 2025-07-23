
import React from 'react';
import { Controller, Control } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SiteVisitCriterionKey, siteVisitCriteria } from '@/types/siteAssessmentTypes';

interface SiteVisitRatingFieldProps {
  field: {
    id: string;
    criterion_key: string;
    grade: string;
    notes: string;
  };
  index: number;
  control: Control<any>;
  disabled: boolean;
}

const SiteVisitRatingField: React.FC<SiteVisitRatingFieldProps> = ({
  field,
  index,
  control,
  disabled
}) => {
  const criterionDetails = siteVisitCriteria.find(c => c.key === field.criterion_key as SiteVisitCriterionKey);
  
  if (!criterionDetails) return null;

  return (
    <div className="p-4 border rounded-md shadow-sm bg-card">
      <h4 className="text-md font-semibold mb-1">{criterionDetails.label}</h4>
      <p className="text-sm text-muted-foreground mb-3">{criterionDetails.description}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <div className="md:col-span-1">
          <Label htmlFor={`siteVisitRatings.${index}.grade`}>Grade</Label>
          <Controller
            name={`siteVisitRatings.${index}.grade`}
            control={control}
            render={({ field: controllerField }) => (
              <Select
                value={controllerField.value || 'none'} 
                onValueChange={(value) => {
                  controllerField.onChange(value === 'none' ? '' : value);
                }}
                disabled={disabled}
              >
                <SelectTrigger id={`siteVisitRatings.${index}.grade`} className="mt-1">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none"><em>No Grade</em></SelectItem>
                  {criterionDetails.grades.map(grade => (
                    <SelectItem key={grade.grade} value={grade.grade}>
                      {grade.grade} - {grade.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor={`siteVisitRatings.${index}.notes`}>Notes (Optional)</Label>
          <Controller
            name={`siteVisitRatings.${index}.notes`}
            control={control}
            render={({ field: controllerField }) => (
              <Textarea
                {...controllerField}
                id={`siteVisitRatings.${index}.notes`}
                placeholder="Optional notes..."
                rows={2}
                className="mt-1"
                value={controllerField.value ?? ''}
                disabled={disabled}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default SiteVisitRatingField;
