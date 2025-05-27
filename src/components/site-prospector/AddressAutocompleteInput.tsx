import React, { useState } from 'react';
import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Define the AddressComponents interface for consistent typing
export interface AddressComponents {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

interface AddressAutocompleteInputProps {
  onAddressSelect: (addressDetails: AddressComponents) => void;
  label?: string;
  id?: string;
  initialValue?: string;
  error?: string;
}

// Create a custom hook to handle the Google Maps Places API
const useGooglePlacesAutocomplete = () => {
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [loading, setLoading] = useState(false);

  const autocompleteService = useMemo(() => {
    if (typeof window !== 'undefined' && window.google) {
      return new google.maps.places.AutocompleteService();
    }
    return null;
  }, []);

  const placesService = useMemo(() => {
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      return new google.maps.places.PlacesService(document.createElement('div'));
    }
    return null;
  }, []);

  const getPlacePredictions = async (input: string) => {
    if (!autocompleteService || !input.trim()) {
      setPredictions([]);
      return;
    }

    setLoading(true);
    try {
      const request = {
        input,
        componentRestrictions: { country: ['us', 'ca'] },
        types: ['address', 'establishment'] 
      };

      autocompleteService.getPlacePredictions(
        request,
        (results, status) => {
          setLoading(false);
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results);
          } else {
            setPredictions([]);
            // Optionally log non-OK statuses for debugging, but avoid console.error for common cases like ZERO_RESULTS
            if (status !== google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
              console.warn('Google Places Autocomplete returned status:', status);
            }
          }
        }
      );
    } catch (error) {
      console.error('Error fetching predictions:', error);
      setLoading(false);
      setPredictions([]);
    }
  };

  const getPlaceDetails = (placeId: string): Promise<AddressComponents> => {
    return new Promise((resolve, reject) => {
      if (!placesService) {
        reject(new Error('Places service not available'));
        return;
      }

      placesService.getDetails(
        { placeId, fields: ['address_components', 'geometry', 'formatted_address', 'name'] }, // Added 'name' field
        (result, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && result) {
            const components: AddressComponents = {
              addressLine1: '',
              city: '',
              stateProvince: '',
              postalCode: '',
              country: '',
              latitude: result.geometry?.location?.lat(),
              longitude: result.geometry?.location?.lng(),
            };

            let streetNumber = '';
            let route = '';

            result.address_components?.forEach((component) => {
              const types = component.types;
              if (types.includes('street_number')) streetNumber = component.long_name;
              if (types.includes('route')) route = component.long_name;
              if (types.includes('locality')) components.city = component.long_name;
              if (types.includes('administrative_area_level_1')) components.stateProvince = component.short_name;
              if (types.includes('postal_code')) components.postalCode = component.long_name;
              if (types.includes('country')) components.country = component.long_name;
            });
            
            const constructedAddressLine1 = `${streetNumber} ${route}`.trim();

            // Prioritize establishment name if available and no street/route, then constructed address, then formatted_address
            if (result.name && !constructedAddressLine1 && result.types?.includes('establishment')) {
                components.addressLine1 = result.name;
                // Attempt to append city for context if name is used and city is known
                if(components.city && !result.name.toLowerCase().includes(components.city.toLowerCase())) {
                    const mainAddressPartFromFormatted = result.formatted_address?.split(',')[0]?.trim();
                    if (mainAddressPartFromFormatted && mainAddressPartFromFormatted !== result.name) {
                         components.addressLine1 = mainAddressPartFromFormatted; // Prefer formatted address if it has more detail
                    }
                }
            } else if (constructedAddressLine1) {
                components.addressLine1 = constructedAddressLine1;
            } else if (result.formatted_address) {
              // Fallback for addressLine1 using the first part of formatted_address
              const formattedAddressParts = result.formatted_address.split(',');
              if (formattedAddressParts.length > 0) {
                components.addressLine1 = formattedAddressParts[0].trim();
              }
            } else if (result.name) { // Fallback to name if no addressLine1 could be constructed
                components.addressLine1 = result.name;
            }


            // Ensure addressLine1 isn't empty if possible
            if (!components.addressLine1 && result.formatted_address) {
                components.addressLine1 = result.formatted_address.split(',')[0].trim();
            }


            resolve(components);
          } else {
            reject(new Error(`Error fetching place details: ${status}`));
          }
        }
      );
    });
  };

  return { predictions, loading, getPlacePredictions, getPlaceDetails, setPredictions };
};

const AddressAutocompleteInput: React.FC<AddressAutocompleteInputProps> = ({
  onAddressSelect,
  label = "Search Address or Place",
  id = "address-autocomplete",
  initialValue = "",
  error,
}) => {
  const [address, setAddress] = useState(initialValue);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { predictions, loading, getPlacePredictions, getPlaceDetails, setPredictions } = useGooglePlacesAutocomplete();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddress(value);
    setShowSuggestions(true);
    getPlacePredictions(value);
  };

  const handleSelectSuggestion = async (placeId: string, description: string) => {
    // Use the description for the input field as it's usually more complete for display
    setAddress(description); 
    setShowSuggestions(false);
    setPredictions([]); 
    
    try {
      const addressDetails = await getPlaceDetails(placeId);
      onAddressSelect(addressDetails);
    } catch (error) {
      console.error('Error selecting address/place:', error);
      // Optionally, inform the user via a toast or error message display
    }
  };

  return (
    <div className="relative">
      {label && <Label htmlFor={id}>{label}</Label>}
      <Input
        id={id}
        value={address}
        onChange={handleInputChange}
        placeholder="Start typing an address or place name..."
        className={`location-search-input ${error ? 'border-destructive' : ''}`}
        onFocus={() => address && setShowSuggestions(true)}
        onBlur={() => {
          // Delay hiding suggestions to allow for clicking on them
          setTimeout(() => setShowSuggestions(false), 200);
        }}
      />
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
      
      {showSuggestions && (predictions.length > 0 || loading) && (
        <div className="autocomplete-dropdown-container absolute z-50 w-full border bg-card shadow-lg rounded-md mt-1 max-h-60 overflow-y-auto">
          {loading && <div className="p-2 text-muted-foreground">Loading...</div>}
          {predictions.map((prediction) => (
            <div
              key={prediction.place_id}
              className="suggestion-item p-2 hover:bg-accent/50 cursor-pointer"
              onClick={() => handleSelectSuggestion(prediction.place_id, prediction.description)}
            >
              <span>{prediction.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddressAutocompleteInput;
