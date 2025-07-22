import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SECTION_ORDER } from '@/config/targetMetricsConfig';
import { getCustomSections } from '@/services/customMetricSectionsService';
import { getUserAccount } from '@/services/userAccountService';
import { useAuth } from '@/contexts/AuthContext';

// Get the available sections in the correct order
function useAvailableSections() {
  const [accountId, setAccountId] = React.useState<string | undefined>();
  const { user } = useAuth();

  React.useEffect(() => {
    const fetchAccountId = async () => {
      if (!user?.id) return;
      try {
        const account = await getUserAccount(user.id);
        setAccountId(account?.id);
      } catch (error) {
        console.error('Error fetching account:', error);
      }
    };
    fetchAccountId();
  }, [user?.id]);

  const { data: customSections = [] } = useQuery({
    queryKey: ['customSections', accountId],
    queryFn: () => getCustomSections(accountId!),
    enabled: !!accountId,
  });

  // Combine predefined sections with custom sections
  const customSectionNames = customSections.map(section => section.name);
  return [...SECTION_ORDER, ...customSectionNames];
}

const CustomMetricFormSchema = z.object({
  name: z.string().min(1, "Metric name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Section is required"),
  units: z.string().optional(),
  target_value: z.coerce.number().min(0, "Target value must be positive"),
  higher_is_better: z.boolean(),
});

type CustomMetricFormData = z.infer<typeof CustomMetricFormSchema>;

interface CustomMetricFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CustomMetricFormData) => void;
  initialData?: Partial<CustomMetricFormData>;
  isEditing?: boolean;
}

const CustomMetricForm: React.FC<CustomMetricFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEditing = false,
}) => {
  const availableSections = useAvailableSections();
  
  const form = useForm<CustomMetricFormData>({
    resolver: zodResolver(CustomMetricFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      category: initialData?.category || '',
      units: initialData?.units || '',
      target_value: initialData?.target_value || 0,
      higher_is_better: initialData?.higher_is_better ?? true,
    },
  });

  React.useEffect(() => {
    if (open && initialData) {
      form.reset({
        name: initialData.name || '',
        description: initialData.description || '',
        category: initialData.category || '',
        units: initialData.units || '',
        target_value: initialData.target_value || 0,
        higher_is_better: initialData.higher_is_better ?? true,
      });
    } else if (open && !initialData) {
      form.reset({
        name: '',
        description: '',
        category: '',
        units: '',
        target_value: 0,
        higher_is_better: true,
      });
    }
  }, [open, initialData, form]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    form.handleSubmit((data) => {
      console.log('Custom metric form submitted:', data);
      onSubmit(data);
    })(e);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    form.reset();
    onOpenChange(false);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    onOpenChange(open);
  };

  // Check if a section is custom (not in SECTION_ORDER)
  const isCustomSection = (section: string) => {
    return !SECTION_ORDER.includes(section);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[425px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Custom Metric' : 'Add Custom Metric'}
          </DialogTitle>
          <DialogDescription>
            Create a custom metric specific to your business needs.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Metric Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Customer Satisfaction Score" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Section</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a section for this metric" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableSections.map((section) => (
                        <SelectItem key={section} value={section}>
                          <div className="flex items-center gap-2">
                            {section}
                            {isCustomSection(section) && (
                              <Badge variant="secondary" className="text-xs">
                                Custom
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe what this metric measures..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="units"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Units (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., score, %, dollars" {...field} />
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

export default CustomMetricForm;