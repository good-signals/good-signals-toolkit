
    ```tsx
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
    import AddressAutocompleteInput, { AddressComponents } from './AddressAutocompleteInput'; // Import the new component

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
      // Store latitude and longitude from autocomplete
      const [coordinates, setCoordinates] = useState<{ lat?: number; lng?: number }>({});


      const { register, handleSubmit, formState: { errors }, setValue, watch, trigger } = useForm<AddressFormData>({
        resolver: zodResolver(addressSchema),
      });

      const assessmentNameValue = watch("assessment_name"); // To pass to autocomplete if needed, or manage separately

      const handleAddressSelected = (addressDetails: AddressComponents) => {
        setValue("address_line1", addressDetails.addressLine1, { shouldValidate: true });
        setValue("city", addressDetails.city, { shouldValidate: true });
        setValue("state_province", addressDetails.stateProvince, { shouldValidate: true });
        setValue("postal_code", addressDetails.postalCode, { shouldValidate: true });
        setValue("country", addressDetails.country, { shouldValidate: true });
        if (addressDetails.latitude && addressDetails.longitude) {
          setValue("latitude", addressDetails.latitude);
          setValue("longitude", addressDetails.longitude);
          setCoordinates({ lat: addressDetails.latitude, lng: addressDetails.longitude });
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
            latitude: coordinates.lat, // Use stored coordinates
            longitude: coordinates.lng, // Use stored coordinates
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
            <CardContent className="space-y-6"> {/* Increased spacing */}
              <div>
                <Label htmlFor="assessment_name">Assessment Name</Label>
                <Input id="assessment_name" {...register("assessment_name")} />
                {errors.assessment_name && <p className="text-sm text-destructive mt-1">{errors.assessment_name.message}</p>}
              </div>
              
              {/* Address Autocomplete */}
              <AddressAutocompleteInput
                onAddressSelect={handleAddressSelected}
                label="Search and Select Address"
                id="address_search"
                error={errors.address_line1?.message} // Display general address error here
              />

              {/* Hidden or read-only fields populated by autocomplete, shown for clarity/debugging */}
              {/* You might want to make these read-only or visually distinct */}
              <div className="space-y-4 mt-4 p-4 border border-dashed rounded-md bg-muted/30">
                <h3 className="text-sm font-medium text-muted-foreground">Selected Address Details (auto-filled)</h3>
                <div>
                  <Label htmlFor="address_line1_display">Address Line 1</Label>
                  <Input id="address_line1_display" {...register("address_line1")} readOnly className="bg-muted/50" />
                  {errors.address_line1 && !errors.address_line1.message?.includes("Search") && <p className="text-sm text-destructive mt-1">{errors.address_line1.message}</p>}
                </div>
                <div>
                  <Label htmlFor="address_line2">Address Line 2 (Optional)</Label>
                  <Input id="address_line2" {...register("address_line2")} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city_display">City</Label>
                    <Input id="city_display" {...register("city")} readOnly className="bg-muted/50" />
                    {errors.city && <p className="text-sm text-destructive mt-1">{errors.city.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="state_province_display">State/Province</Label>
                    <Input id="state_province_display" {...register("state_province")} readOnly className="bg-muted/50" />
                    {errors.state_province && <p className="text-sm text-destructive mt-1">{errors.state_province.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="postal_code_display">Postal Code</Label>
                    <Input id="postal_code_display" {...register("postal_code")} readOnly className="bg-muted/50" />
                    {errors.postal_code && <p className="text-sm text-destructive mt-1">{errors.postal_code.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="country_display">Country</Label>
                    <Input id="country_display" {...register("country")} readOnly className="bg-muted/50" />
                    {errors.country && <p className="text-sm text-destructive mt-1">{errors.country.message}</p>}
                  </div>
                </div>
                {coordinates.lat && coordinates.lng && (
                  <p className="text-xs text-muted-foreground">
                    Lat: {coordinates.lat.toFixed(6)}, Lng: {coordinates.lng.toFixed(6)}
                  </p>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground pt-4"> {/* Added padding top */}
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
    ```
    