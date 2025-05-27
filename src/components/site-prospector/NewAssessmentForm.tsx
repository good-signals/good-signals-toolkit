import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
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
import AddressAutocompleteInput, { AddressComponents } from './AddressAutocompleteInput';

const addressSchema = z.object({
  assessment_name: z.string().min(1, "Assessment name is required"),
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
  const [coordinates, setCoordinates] = useState<{ lat?: number; lng?: number }>({});

  const { register, handleSubmit, formState: { errors }, setValue, watch, trigger } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
  });

  const handleAddressSelected = (addressDetails: AddressComponents) => {
    setValue("address_line1", addressDetails.addressLine1, { shouldValidate: true });
    setValue("city", addressDetails.city, { shouldValidate: true });
    setValue("state_province", addressDetails.stateProvince, { shouldValidate: true });
    setValue("postal_code", addressDetails.postalCode, { shouldValidate: true });
    setValue("country", addressDetails.country, { shouldValidate: true });
    if (addressDetails.addressLine2) {
      setValue("address_line2", addressDetails.addressLine2);
    } else {
      setValue("address_line2", ""); // Clear if not present
    }
    if (addressDetails.latitude && addressDetails.longitude) {
      setValue("latitude", addressDetails.latitude);
      setValue("longitude", addressDetails.longitude);
      setCoordinates({ lat: addressDetails.latitude, lng: addressDetails.longitude });
    } else {
      setValue("latitude", undefined);
      setValue("longitude", undefined);
      setCoordinates({});
    }
    // Trigger validation for all fields after setting them
    trigger(["address_line1", "city", "state_province", "postal_code", "country"]);
  };

  const onSubmit: SubmitHandler<AddressFormData> = async (data) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to create an assessment.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const assessmentPayload: Omit<SiteAssessmentInsert, 'user_id' | 'account_id' | 'target_metric_set_id'> = {
        assessment_name: data.assessment_name,
        address_line1: data.address_line1,
        address_line2: data.address_line2,
        city: data.city,
        state_province: data.state_province,
        postal_code: data.postal_code,
        country: data.country,
        latitude: coordinates.lat, 
        longitude: coordinates.lng,
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
            <Input 
              id="assessment_name" 
              {...register("assessment_name")} 
              placeholder="Enter a name for this assessment"
            />
            {errors.assessment_name && <p className="text-sm text-destructive mt-1">{errors.assessment_name.message}</p>}
          </div>
          
          {/* Address Autocomplete */}
          <AddressAutocompleteInput
            onAddressSelect={handleAddressSelected}
            label="Search and Select Address"
            id="address_search"
            error={errors.address_line1?.message} // Display error for address_line1 here as it's the primary address field
          />
          
          {/* Optional Address Line 2 - Kept as user might need it */}
          <div>
            <Label htmlFor="address_line2">Address Line 2 (Optional)</Label>
            <Input 
              id="address_line2" 
              {...register("address_line2")} 
              placeholder="Apartment, suite, unit, building, floor, etc."
            />
          </div>

          {/* Display validation errors for other address fields if they exist, typically after autocomplete fails or if manually cleared */}
          {errors.city && <p className="text-sm text-destructive mt-1">City: {errors.city.message}</p>}
          {errors.state_province && <p className="text-sm text-destructive mt-1">State/Province: {errors.state_province.message}</p>}
          {errors.postal_code && <p className="text-sm text-destructive mt-1">Postal Code: {errors.postal_code.message}</p>}
          {errors.country && <p className="text-sm text-destructive mt-1">Country: {errors.country.message}</p>}
          
          {coordinates.lat && coordinates.lng && (
            <p className="text-xs text-muted-foreground">
              Coordinates: Lat: {coordinates.lat.toFixed(6)}, Lng: {coordinates.lng.toFixed(6)}
            </p>
          )}
          
          <p className="text-sm text-muted-foreground pt-4">
            Note: Pin drop functionality will be added later. For now, please use the address search.
            Step 2 (Select Target Metric Type) and Step 3 (Input fields) will appear after this step.
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
