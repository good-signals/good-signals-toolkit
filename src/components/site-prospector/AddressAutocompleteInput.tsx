
import React, { useState, useEffect, useRef } from 'react';
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

declare global {
  interface Window {
    google: typeof google;
    initGooglePlaces: () => void;
  }
}

// Create a custom hook to handle the Google Maps Places API
const useGooglePlacesAutocomplete = () => {
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);

  // Check if Google Maps is already loaded
  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      console.log('[AddressAutocompleteInput] Google Maps already loaded');
      setIsGoogleLoaded(true);
      return;
    }

    // Create global callback function
    window.initGooglePlaces = () => {
      console.log('[AddressAutocompleteInput] Google Maps API loaded successfully');
      setIsGoogleLoaded(true);
    };

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log('[AddressAutocompleteInput] Google Maps script already exists, waiting for load...');
      return;
    }

    // Load Google Maps script
    const script = document.createElement('script');
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCYg8pkH1rO2z8p6YtsocdhG0s-FKInCnU';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlaces`;
    script.async = true;
    script.defer = true;
    
    script.onerror = (error) => {
      console.error('[AddressAutocompleteInput] Failed to load Google Maps API:', error);
    };
    
    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (window.initGooglePlaces) {
        delete window.initGooglePlaces;
      }
    };
  }, []);

  const autocompleteService = useMemo(() => {
    if (isGoogleLoaded && window.google && window.google.maps && window.google.maps.places) {
      console.log('[AddressAutocompleteInput] AutocompleteService initialized');
      return new google.maps.places.AutocompleteService();
    }
    return null;
  }, [isGoogleLoaded]);

  const placesService = useMemo(() => {
    if (isGoogleLoaded && window.google && window.google.maps && window.google.maps.places) {
      console.log('[AddressAutocompleteInput] PlacesService initialized');
      return new google.maps.places.PlacesService(document.createElement('div'));
    }
    return null;
  }, [isGoogleLoaded]);

  const getPlacePredictions = async (input: string) => {
    if (!autocompleteService || !input.trim()) {
      setPredictions([]);
      return;
    }

    setLoading(true);
    try {
      const request: google.maps.places.AutocompletionRequest = {
        input,
        componentRestrictions: { country: ['us', 'ca'] },
        types: ['address', 'establishment']
      };

      autocompleteService.getPlacePredictions(
        request,
        (results, status) => {
          setLoading(false);
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            console.log('[AddressAutocompleteInput] Predictions received:', results.length);
            setPredictions(results);
          } else {
            setPredictions([]);
            if (status !== google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
              console.warn('[AddressAutocompleteInput] Places API error:', status);
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
        reject(new Error('Places service not available'));
        return;
      }

      console.log(`[AddressAutocompleteInput] Fetching details for placeId: ${placeId}`);
      placesService.getDetails(
        { 
          placeId, 
          fields: ['address_components', 'geometry', 'formatted_address', 'name', 'types'] 
        },
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

            // Construct address line 1
            if (streetNumber && route) {
              components.addressLine1 = `${streetNumber} ${route}`;
            } else if (result.name && result.types?.includes('establishment')) {
              components.addressLine1 = result.name;
            } else if (result.formatted_address) {
              components.addressLine1 = result.formatted_address.split(',')[0].trim();
            }

            console.log('[AddressAutocompleteInput] Parsed address components:', components);
            resolve(components);
          } else {
            console.error(`[AddressAutocompleteInput] Error fetching place details: ${status}`);
            reject(new Error(`Error fetching place details: ${status}`));
          }
        }
      );
    });
  };

  return { 
    predictions, 
    loading, 
    getPlacePredictions, 
    getPlaceDetails, 
    setPredictions,
    isGoogleLoaded 
  };
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
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { 
    predictions, 
    loading, 
    getPlacePredictions, 
    getPlaceDetails, 
    setPredictions,
    isGoogleLoaded 
  } = useGooglePlacesAutocomplete();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddress(value);
    
    if (value.trim() === "") {
      setShowSuggestions(false);
      setPredictions([]);
    } else if (isGoogleLoaded) {
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
      console.error('[AddressAutocompleteInput] Error selecting address:', error);
    }
  };

  const handleInputFocus = () => {
    if (address && predictions.length > 0) {
      setShowSuggestions(true);
    } else if (address && isGoogleLoaded) {
      getPlacePredictions(address);
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    // Only hide suggestions if not clicking on dropdown
    if (!dropdownRef.current?.contains(e.relatedTarget as Node)) {
      setTimeout(() => setShowSuggestions(false), 200);
    }
  };

  return (
    <div className="relative">
      {label && <Label htmlFor={id}>{label}</Label>}
      <Input
        ref={inputRef}
        id={id}
        value={address}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder="Start typing an address or place name..."
        className={`${error ? 'border-destructive' : ''}`}
        autoComplete="off"
      />
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
      
      {showSuggestions && isGoogleLoaded && (predictions.length > 0 || loading) && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full border bg-card shadow-lg rounded-md mt-1 max-h-60 overflow-y-auto"
        >
          {loading && (
            <div className="p-3 text-sm text-muted-foreground">
              Loading suggestions...
            </div>
          )}
          {predictions.map((prediction) => (
            <div
              key={prediction.place_id}
              className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0 text-sm"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectSuggestion(prediction.place_id, prediction.description);
              }}
            >
              <div className="font-medium">{prediction.structured_formatting?.main_text}</div>
              <div className="text-muted-foreground text-xs">
                {prediction.structured_formatting?.secondary_text}
              </div>
            </div>
          ))}
          {!loading && predictions.length === 0 && address.trim() !== "" && (
            <div className="p-3 text-sm text-muted-foreground">
              No suggestions found.
            </div>
          )}
        </div>
      )}
      
      {!isGoogleLoaded && address && (
        <div className="absolute z-50 w-full border bg-card shadow-lg rounded-md mt-1 p-3 text-sm text-muted-foreground">
          Loading Google Places...
        </div>
      )}
    </div>
  );
};

export default AddressAutocompleteInput;
