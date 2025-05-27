
import React, { useState } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { createSiteAssessment } from '@/services/siteAssessmentService';
import { SiteAssessmentInsert } from '@/types/siteAssessmentTypes';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import AddressAutocompleteInput from './AddressAutocompleteInput'; // Import the new component

const addressSchema = z.object({
  assessment_name: z.string().min(1, "Assessment name is required"),
  address_search: z.string().optional(), // For the autocomplete input itself
  address_line1: z.string().min(1, "Address is required"),
  address_line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state_province: z.string().min(1, "State/Province is required"),
  postal_code: z.string().min(1, "Postal Code is required"),
  country: z.string().min(1, "Country is required"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

type AddressFormData = z.infer<typeof addressSchema>;

interface NewAssessmentFormProps {
  onAssessmentCreated: (assessmentId: string) => void;
  onCancel: () => void;
}

const NewAssessmentForm: React.FC<NewAssessmentFormProps> = ({ onAssessmentCreated, onCancel }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autocompleteAddress, setAutocompleteAddress] = useState('');

  const { register, handleSubmit, formState: { errors }, control, setValue, trigger } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      address_line1: '',
      city: '',
      state_province: '',
      postal_code: '',
      country: '',
    }
  });

  const handleAddressSelected = (selected: {
    addressLine1: string;
    city: string;
    stateProvince: string;
    postalCode: string;
    country: string;
    latitude?: number;
    longitude?: number;
  }) => {
    setValue("address_line1", selected.addressLine1, { shouldValidate: true });
    setValue("city", selected.city, { shouldValidate: true });
    setValue("state_province", selected.stateProvince, { shouldValidate: true });
    setValue("postal_code", selected.postalCode, { shouldValidate: true });
    setValue("country", selected.country, { shouldValidate: true });
    if (selected.latitude) setValue("latitude", selected.latitude);
    if (selected.longitude) setValue("longitude", selected.longitude);
    
    // Trigger validation for all dependent fields after setting them
    trigger(["address_line1", "city", "state_province", "postal_code", "country"]);
  };

  const onSubmit: SubmitHandler<AddressFormData> = async (data) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to create an assessment.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { address_search, ...assessmentData } = data; // Exclude address_search from payload

      const assessmentPayload: Omit<SiteAssessmentInsert, 'user_id' | 'account_id' | 'target_metric_set_id'> = {
        ...assessmentData,
        // Ensure latitude and longitude are numbers or null
        latitude: assessmentData.latitude ?? null,
        longitude: assessmentData.longitude ?? null,
      };
      
      const newAssessment = await createSiteAssessment(assessmentPayload, user.id);
      toast({ title: "Success", description: "New site assessment initiated." });
      onAssessmentCreated(newAssessment.id);
    } catch (error) {
      console.error("Failed to create assessment:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Error", description: `Failed to create assessment: ${errorMessage}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>New Site Assessment - Step 1: Address</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="assessment_name">Assessment Name</Label>
            <Input id="assessment_name" {...register("assessment_name")} />
            {errors.assessment_name && <p className="text-sm text-destructive">{errors.assessment_name.message}</p>}
          </div>

          <Controller
            name="address_search"
            control={control}
            render={({ field }) => (
              <AddressAutocompleteInput
                id="address_search_input"
                label="Search for Address (Autocomplete)"
                address={autocompleteAddress}
                onAddressChange={(newAddress) => {
                  setAutocompleteAddress(newAddress);
                  // field.onChange(newAddress); // We don't strictly need to store this in form state if only for search
                }}
                onAddressSelect={handleAddressSelected}
                error={errors.address_line1?.message} // Show general address error here for simplicity
              />
            )}
          />
          
          <p className="text-sm text-muted-foreground">
            Or enter address details manually below. Autocomplete will populate these fields.
          </p>

          <div>
            <Label htmlFor="address_line1">Address Line 1</Label>
            <Input id="address_line1" {...register("address_line1")} />
            {errors.address_line1 && <p className="text-sm text-destructive">{errors.address_line1.message}</p>}
          </div>
          <div>
            <Label htmlFor="address_line2">Address Line 2 (Optional)</Label>
            <Input id="address_line2" {...register("address_line2")} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register("city")} />
              {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
            </div>
            <div>
              <Label htmlFor="state_province">State/Province</Label>
              <Input id="state_province" {...register("state_province")} />
              {errors.state_province && <p className="text-sm text-destructive">{errors.state_province.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input id="postal_code" {...register("postal_code")} />
              {errors.postal_code && <p className="text-sm text-destructive">{errors.postal_code.message}</p>}
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...register("country")} />
              {errors.country && <p className="text-sm text-destructive">{errors.country.message}</p>}
            </div>
          </div>
           <p className="text-sm text-muted-foreground">
            Latitude/Longitude will be captured if available from autocomplete.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Next: Select Metrics
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default NewAssessmentForm;
