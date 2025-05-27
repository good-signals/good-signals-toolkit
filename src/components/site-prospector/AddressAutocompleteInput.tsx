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
      console.log('[AddressAutocompleteInput] Google AutocompleteService initialized.');
      return new google.maps.places.AutocompleteService();
    }
    console.warn('[AddressAutocompleteInput] Google AutocompleteService could not be initialized.');
    return null;
  }, []);

  const placesService = useMemo(() => {
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      console.log('[AddressAutocompleteInput] Google PlacesService initialized.');
      return new google.maps.places.PlacesService(document.createElement('div'));
    }
    console.warn('[AddressAutocompleteInput] Google PlacesService could not be initialized.');
    return null;
  }, []);

  const getPlacePredictions = async (input: string) => {
    if (!autocompleteService) {
      console.warn('[AddressAutocompleteInput] Autocomplete service not available for predictions.');
      setPredictions([]);
      return;
    }
    if (!input.trim()) {
      setPredictions([]);
      return;
    }

    setLoading(true);
    try {
      const request: google.maps.places.AutocompletionRequest = {
        input,
        componentRestrictions: { country: ['us', 'ca'] },
        // Removed specific types: ['address', 'establishment'] to broaden search
        // types: ['address', 'establishment'] // Previous types
      };
      // console.log('[AddressAutocompleteInput] Requesting predictions with:', JSON.stringify(request, null, 2)); // More concise logging now

      autocompleteService.getPlacePredictions(
        request,
        (results, status) => {
          // console.log( // More concise logging now
          //   '[AddressAutocompleteInput] Predictions received. Status:',
          //   status,
          //   'Results:',
          //   results ? results.map(r => ({description: r.description, place_id: r.place_id, types: r.types })) : 'No results or error'
          // );
          setLoading(false);
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results);
             console.log('[AddressAutocompleteInput] Predictions successful for input:', input, 'Count:', results.length);
          } else {
            setPredictions([]);
            if (status !== google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
              console.warn('[AddressAutocompleteInput] Google Places Autocomplete returned status:', status, 'for input:', input);
            } else {
              console.log('[AddressAutocompleteInput] No results found for input:', input);
            }
          }
        }
      );
    } catch (error) {
      console.error('[AddressAutocompleteInput] Error fetching predictions:', error);
      setLoading(false);
      setPredictions([]);
    }
  };

  const getPlaceDetails = (placeId: string): Promise<AddressComponents> => {
    return new Promise((resolve, reject) => {
      if (!placesService) {
        console.warn('[AddressAutocompleteInput] Places service not available for details.');
        reject(new Error('Places service not available'));
        return;
      }
      console.log(`[AddressAutocompleteInput] Fetching details for placeId: ${placeId}`);
      placesService.getDetails(
        { placeId, fields: ['address_components', 'geometry', 'formatted_address', 'name', 'types'] },
        (result, status) => {
          console.log('[AddressAutocompleteInput] Place details received. Status:', status); // Simplified log
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
            if (result.name && (!constructedAddressLine1 || result.types?.includes('establishment')) ) { // Slightly adjusted logic for establishment name preference
                components.addressLine1 = result.name;
                // Attempt to derive a more complete address line 1 from formatted_address if possible
                const mainAddressPartFromFormatted = result.formatted_address?.split(',')[0]?.trim();
                if (mainAddressPartFromFormatted && mainAddressPartFromFormatted.toLowerCase() !== result.name.toLowerCase()) {
                    const nameInFormatted = mainAddressPartFromFormatted.toLowerCase().includes(result.name.toLowerCase());
                    if (nameInFormatted && mainAddressPartFromFormatted.length > result.name.length) {
                         components.addressLine1 = mainAddressPartFromFormatted;
                    } else if (!nameInFormatted) {
                         if (mainAddressPartFromFormatted.match(/\d/) && mainAddressPartFromFormatted.match(/[a-zA-Z]/)) {
                            components.addressLine1 = mainAddressPartFromFormatted;
                         }
                    }
                }
                 // If after all this, addressLine1 is still just the name, and streetNumber/route exists, use that for address and potentially store name elsewhere or append
                if (components.addressLine1.toLowerCase() === result.name.toLowerCase() && constructedAddressLine1) {
                    components.addressLine1 = constructedAddressLine1;
                    // Potentially add name to addressLine2 or a new field if that becomes a requirement
                    // For now, we prioritize a real street address if available over just the establishment name for addressLine1
                }

            } else if (constructedAddressLine1) {
                components.addressLine1 = constructedAddressLine1;
            } else if (result.formatted_address) {
              const formattedAddressParts = result.formatted_address.split(',');
              if (formattedAddressParts.length > 0) {
                components.addressLine1 = formattedAddressParts[0].trim();
              }
            } else if (result.name) { 
                components.addressLine1 = result.name;
            }


            if (!components.addressLine1 && result.formatted_address) {
                components.addressLine1 = result.formatted_address.split(',')[0].trim();
            }
            console.log('[AddressAutocompleteInput] Parsed address components:', components);

            resolve(components);
          } else {
            console.error(`[AddressAutocompleteInput] Error fetching place details: ${status}`, result);
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
    if (value.trim() === "") {
        setShowSuggestions(false);
        setPredictions([]); // Clear predictions if input is empty
    } else {
        setShowSuggestions(true);
        getPlacePredictions(value);
    }
  };

  const handleSelectSuggestion = async (placeId: string, description: string) => {
    setAddress(description); 
    setShowSuggestions(false);
    setPredictions([]); 
    
    try {
      const addressDetails = await getPlaceDetails(placeId);
      onAddressSelect(addressDetails);
    } catch (error) {
      console.error('[AddressAutocompleteInput] Error selecting address/place:', error);
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
        onFocus={() => {
            if (address && predictions.length > 0) { 
                 setShowSuggestions(true);
            } else if (address) { 
                getPlacePredictions(address);
                setShowSuggestions(true);
            }
        }}
        onBlur={() => {
          setTimeout(() => setShowSuggestions(false), 200);
        }}
        autoComplete="off" 
      />
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
      
      {showSuggestions && (predictions.length > 0 || loading) && (
        <div className="autocomplete-dropdown-container absolute z-50 w-full border bg-card shadow-lg rounded-md mt-1 max-h-60 overflow-y-auto">
          {loading && <div className="p-2 text-muted-foreground">Loading...</div>}
          {predictions.map((prediction) => (
            <div
              key={prediction.place_id}
              className="suggestion-item p-2 hover:bg-accent/50 cursor-pointer"
              onMouseDown={() => handleSelectSuggestion(prediction.place_id, prediction.description)}
            >
              <span>{prediction.description}</span>
            </div>
          ))}
          {!loading && predictions.length === 0 && address.trim() !== "" && (
             <div className="p-2 text-muted-foreground">No suggestions found.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default AddressAutocompleteInput;
