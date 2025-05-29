
import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { createSiteAssessment } from '@/services/siteAssessmentService';
import { SiteAssessmentInsert } from '@/types/siteAssessmentTypes';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import AddressAutocompleteInput, { AddressComponents } from './AddressAutocompleteInput';
import AddressMapDisplay from './AddressMapDisplay';

const siteStatusOptions = [
  'Prospect',
  'LOI', 
  'Lease',
  'Development',
  'Open',
  'Closed'
] as const;

// Updated schema to include site_status
const addressSchema = z.object({
  assessment_name: z.string().min(1, "Assessment name is required"),
  address_line1: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state_province: z.string().min(1, "State/Province is required"),
  postal_code: z.string().min(1, "Postal Code is required"),
  country: z.string().min(1, "Country is required"),
  site_status: z.enum(siteStatusOptions).default('Prospect'),
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
    defaultValues: {
      site_status: 'Prospect'
    }
  });

  const handleAddressSelected = (addressDetails: AddressComponents) => {
    console.log('Address selected:', addressDetails);
    setValue("address_line1", addressDetails.addressLine1, { shouldValidate: true });
    setValue("city", addressDetails.city, { shouldValidate: true });
    setValue("state_province", addressDetails.stateProvince, { shouldValidate: true });
    setValue("postal_code", addressDetails.postalCode, { shouldValidate: true });
    setValue("country", addressDetails.country, { shouldValidate: true });
    if (addressDetails.latitude && addressDetails.longitude) {
      setValue("latitude", addressDetails.latitude);
      setValue("longitude", addressDetails.longitude);
      setCoordinates({ lat: addressDetails.latitude, lng: addressDetails.longitude });
    } else {
      setValue("latitude", undefined);
      setValue("longitude", undefined);
      setCoordinates({});
    }
    trigger(["address_line1", "city", "state_province", "postal_code", "country"]);
  };

  const onSubmit: SubmitHandler<AddressFormData> = async (data) => {
    console.log('Form submission started:', { data, user: user?.id });
    
    if (!user) {
      console.error('User not authenticated');
      toast({ title: "Error", description: "You must be logged in to create an assessment.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('Creating assessment with payload:', {
        assessment_name: data.assessment_name,
        address_line1: data.address_line1,
        city: data.city,
        state_province: data.state_province,
        postal_code: data.postal_code,
        country: data.country,
        site_status: data.site_status,
        latitude: coordinates.lat, 
        longitude: coordinates.lng,
        userId: user.id
      });

      const assessmentPayload: Omit<SiteAssessmentInsert, 'user_id' | 'account_id' | 'target_metric_set_id'> = {
        assessment_name: data.assessment_name,
        address_line1: data.address_line1,
        city: data.city,
        state_province: data.state_province,
        postal_code: data.postal_code,
        country: data.country,
        site_status: data.site_status,
        latitude: coordinates.lat, 
        longitude: coordinates.lng,
      };
      
      const newAssessment = await createSiteAssessment(assessmentPayload, user.id);
      console.log('Assessment created successfully:', newAssessment);
      
      if (!newAssessment?.id) {
        throw new Error('Assessment was created but no ID was returned');
      }

      toast({ title: "Success", description: "New site assessment initiated." });
      
      console.log('Calling onAssessmentCreated with ID:', newAssessment.id);
      onAssessmentCreated(newAssessment.id);
      
    } catch (error) {
      console.error("Failed to create assessment:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ 
        title: "Error", 
        description: `Failed to create assessment: ${errorMessage}`, 
        variant: "destructive" 
      });
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
          {/* Assessment Name - First field */}
          <div>
            <Label htmlFor="assessment_name">Assessment Name</Label>
            <Input 
              id="assessment_name" 
              {...register("assessment_name")} 
              placeholder="Enter a name for this assessment"
            />
            {errors.assessment_name && <p className="text-sm text-destructive mt-1">{errors.assessment_name.message}</p>}
          </div>

          {/* Site Status - Second field */}
          <div>
            <Label htmlFor="site_status">Site Status</Label>
            <Select onValueChange={(value) => setValue("site_status", value as typeof siteStatusOptions[number])} defaultValue="Prospect">
              <SelectTrigger>
                <SelectValue placeholder="Select site status" />
              </SelectTrigger>
              <SelectContent>
                {siteStatusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.site_status && <p className="text-sm text-destructive mt-1">{errors.site_status.message}</p>}
          </div>
          
          {/* Address Search - Third field */}
          <div>
            <AddressAutocompleteInput
              onAddressSelect={handleAddressSelected}
              label="Search and Select Address"
              id="address_search"
              error={errors.address_line1?.message}
            />

            {/* Display validation errors for other address fields if they exist */}
            {errors.city && <p className="text-sm text-destructive mt-1">City: {errors.city.message}</p>}
            {errors.state_province && <p className="text-sm text-destructive mt-1">State/Province: {errors.state_province.message}</p>}
            {errors.postal_code && <p className="text-sm text-destructive mt-1">Postal Code: {errors.postal_code.message}</p>}
            {errors.country && <p className="text-sm text-destructive mt-1">Country: {errors.country.message}</p>}
          </div>
          
          {/* Map Display - Fourth section (only when coordinates available) */}
          {coordinates.lat && coordinates.lng && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Coordinates: Lat: {coordinates.lat.toFixed(6)}, Lng: {coordinates.lng.toFixed(6)}
              </p>
              <AddressMapDisplay latitude={coordinates.lat} longitude={coordinates.lng} />
            </div>
          )}
          
          {/* Information text - Last section */}
          <div className="pt-4">
            <p className="text-sm text-muted-foreground">
              Step 2 (Select Target Metric Set) and Step 3 (Input fields) will appear after this step.
            </p>
          </div>
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
