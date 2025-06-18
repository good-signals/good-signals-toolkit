
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { VISITOR_PROFILE_CATEGORY, MEASUREMENT_TYPES } from '@/types/targetMetrics';

const VisitorProfileMetricFormSchema = z.object({
  label: z.string().min(1, "Metric name is required"),
  target_value: z.coerce.number().min(0, "Target value must be positive"),
  measurement_type: z.enum(MEASUREMENT_TYPES),
  higher_is_better: z.boolean(),
});

type VisitorProfileMetricFormData = z.infer<typeof VisitorProfileMetricFormSchema>;

interface VisitorProfileMetricFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: VisitorProfileMetricFormData) => void;
  initialData?: Partial<VisitorProfileMetricFormData>;
  isEditing?: boolean;
}

const VisitorProfileMetricForm: React.FC<VisitorProfileMetricFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEditing = false,
}) => {
  const form = useForm<VisitorProfileMetricFormData>({
    resolver: zodResolver(VisitorProfileMetricFormSchema),
    defaultValues: {
      label: initialData?.label || '',
      target_value: initialData?.target_value || 0,
      measurement_type: initialData?.measurement_type || 'Index',
      higher_is_better: initialData?.higher_is_better ?? true,
    },
  });

  const handleSubmit = (data: VisitorProfileMetricFormData) => {
    onSubmit(data);
    form.reset();
    onOpenChange(false);
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Visitor Profile Metric' : 'Add Visitor Profile Metric'}
          </DialogTitle>
          <DialogDescription>
            Create a custom visitor profile metric to track demographic and visitor characteristics.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Metric Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Average Age, Income Level" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Value</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Enter target value"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="measurement_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Measurement Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select measurement type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Index">Index</SelectItem>
                      <SelectItem value="Amount">Amount</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="higher_is_better"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Higher is Better</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Check if higher values indicate better performance
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit">
                {isEditing ? 'Update Metric' : 'Add Metric'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default VisitorProfileMetricForm;
