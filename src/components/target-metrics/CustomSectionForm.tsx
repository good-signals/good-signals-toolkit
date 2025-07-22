import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const CustomSectionFormSchema = z.object({
  name: z.string().min(1, "Section name is required").max(100, "Section name must be less than 100 characters"),
});

type CustomSectionFormData = z.infer<typeof CustomSectionFormSchema>;

interface CustomSectionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CustomSectionFormData) => void;
  initialData?: Partial<CustomSectionFormData>;
  isEditing?: boolean;
}

export const CustomSectionForm: React.FC<CustomSectionFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEditing = false,
}) => {
  const form = useForm<CustomSectionFormData>({
    resolver: zodResolver(CustomSectionFormSchema),
    defaultValues: {
      name: "",
      ...initialData,
    },
  });

  React.useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset(initialData);
      } else {
        form.reset({ name: "" });
      }
    }
  }, [open, initialData, form]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    form.handleSubmit(onSubmit)();
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    form.reset();
    onOpenChange(false);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Section" : "Add Custom Section"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Section Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter section name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit">
                {isEditing ? "Update" : "Add"} Section
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};