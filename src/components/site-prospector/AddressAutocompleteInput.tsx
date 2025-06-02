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
  const [apiError, setApiError] = useState<string | null>(null);

  // Check if Google Maps is already loaded
  useEffect(() => {
    let isMounted = true;
    let checkInterval: NodeJS.Timeout;

    const checkGoogleMapsLoaded = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        console.log('[AddressAutocompleteInput] Google Maps already loaded');
        if (isMounted) {
          setIsGoogleLoaded(true);
          setApiError(null);
        }
        return true;
      }
      return false;
    };

    // First check if it's already loaded
    if (checkGoogleMapsLoaded()) {
      return;
    }

    // Create global callback function
    window.initGooglePlaces = () => {
      console.log('[AddressAutocompleteInput] Google Maps API loaded via callback');
      if (isMounted && checkGoogleMapsLoaded()) {
        setIsGoogleLoaded(true);
        setApiError(null);
      }
    };

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]') as HTMLScriptElement;
    if (existingScript) {
      console.log('[AddressAutocompleteInput] Google Maps script already exists, waiting for load...');
      
      // If script exists but Google isn't loaded yet, wait for it
      checkInterval = setInterval(() => {
        if (checkGoogleMapsLoaded() && isMounted) {
          clearInterval(checkInterval);
        }
      }, 200);

      // Cleanup after timeout
      setTimeout(() => {
        if (checkInterval) clearInterval(checkInterval);
        if (!window.google || !window.google.maps) {
          console.error('[AddressAutocompleteInput] Google Maps failed to load within timeout');
          if (isMounted) {
            setApiError('Google Maps API failed to load');
          }
        }
      }, 15000);
      return;
    }

    // Load script if it doesn't exist
    console.log('[AddressAutocompleteInput] Loading Google Maps script...');
    const script = document.createElement('script');
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCYg8pkH1rO2z8p6YtsocdhG0s-FKInCnU';
    
    if (!apiKey || apiKey === 'your-api-key-here') {
      console.error('[AddressAutocompleteInput] Invalid or missing Google Maps API key');
      if (isMounted) {
        setApiError('Google Maps API key not configured');
      }
      return;
    }

    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlaces`;
    script.async = true;
    script.defer = true;
    
    script.onerror = (error) => {
      console.error('[AddressAutocompleteInput] Failed to load Google Maps API script:', error);
      if (isMounted) {
        setApiError('Failed to load Google Maps API');
      }
    };
    
    document.head.appendChild(script);

    // Set timeout for loading
    setTimeout(() => {
      if (!window.google || !window.google.maps) {
        console.error('[AddressAutocompleteInput] Google Maps loading timeout');
        if (isMounted) {
          setApiError('Google Maps API loading timeout');
        }
      }
    }, 15000);

    return () => {
      isMounted = false;
      if (checkInterval) {
        clearInterval(checkInterval);
      }
      if (window.initGooglePlaces) {
        delete window.initGooglePlaces;
      }
    };
  }, []);

  const autocompleteService = useMemo(() => {
    if (isGoogleLoaded && window.google?.maps?.places?.AutocompleteService) {
      console.log('[AddressAutocompleteInput] AutocompleteService initialized');
      return new window.google.maps.places.AutocompleteService();
    }
    return null;
  }, [isGoogleLoaded]);

  const placesService = useMemo(() => {
    if (isGoogleLoaded && window.google?.maps?.places?.PlacesService) {
      console.log('[AddressAutocompleteInput] PlacesService initialized');
      return new window.google.maps.places.PlacesService(document.createElement('div'));
    }
    return null;
  }, [isGoogleLoaded]);

  const getPlacePredictions = async (input: string) => {
    if (!autocompleteService || !input.trim()) {
      setPredictions([]);
      return;
    }

    if (apiError) {
      console.warn('[AddressAutocompleteInput] Skipping prediction request due to API error:', apiError);
      return;
    }

    setLoading(true);
    try {
      const request: google.maps.places.AutocompletionRequest = {
        input: input.trim(),
        componentRestrictions: { country: ['us', 'ca'] },
        types: ['address', 'establishment']
      };

      console.log('[AddressAutocompleteInput] Requesting predictions for:', input);

      autocompleteService.getPlacePredictions(
        request,
        (results, status) => {
          setLoading(false);
          console.log('[AddressAutocompleteInput] Prediction response:', { status, resultsCount: results?.length || 0 });
          
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results);
            setApiError(null);
          } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            setPredictions([]);
          } else {
            console.warn('[AddressAutocompleteInput] Places API error:', status);
            setPredictions([]);
            if (status === google.maps.places.PlacesServiceStatus.REQUEST_DENIED) {
              setApiError('Google Places API access denied. Please check your API key.');
            } else if (status === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {
              setApiError('Google Places API quota exceeded.');
            }
          }
        }
      );
    } catch (error) {
      console.error('[AddressAutocompleteInput] Error fetching predictions:', error);
      setLoading(false);
      setPredictions([]);
      setApiError('Failed to fetch address suggestions');
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
    isGoogleLoaded,
    apiError
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
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  
  const { 
    predictions, 
    loading, 
    getPlacePredictions, 
    getPlaceDetails, 
    setPredictions,
    isGoogleLoaded,
    apiError
  } = useGooglePlacesAutocomplete();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddress(value);
    
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    if (value.trim() === "") {
      setShowSuggestions(false);
      setPredictions([]);
    } else if (isGoogleLoaded && !apiError) {
      setShowSuggestions(true);
      // Debounce the API call
      debounceTimeoutRef.current = setTimeout(() => {
        getPlacePredictions(value);
      }, 300);
    }
  };

  const handleSelectSuggestion = async (placeId: string, description: string) => {
    console.log('[AddressAutocompleteInput] Selecting suggestion:', { placeId, description });
    setAddress(description);
    setShowSuggestions(false);
    setPredictions([]);
    
    try {
      const addressDetails = await getPlaceDetails(placeId);
      console.log('[AddressAutocompleteInput] Address details retrieved:', addressDetails);
      onAddressSelect(addressDetails);
    } catch (error) {
      console.error('[AddressAutocompleteInput] Error selecting address:', error);
    }
  };

  const handleInputFocus = () => {
    if (address && predictions.length > 0 && !apiError) {
      setShowSuggestions(true);
    } else if (address && isGoogleLoaded && !apiError) {
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

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

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
        disabled={!!apiError}
      />
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
      {apiError && <p className="text-sm text-destructive mt-1">{apiError}</p>}
      
      {showSuggestions && isGoogleLoaded && !apiError && (predictions.length > 0 || loading) && (
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
      
      {!isGoogleLoaded && !apiError && address && (
        <div className="absolute z-50 w-full border bg-card shadow-lg rounded-md mt-1 p-3 text-sm text-muted-foreground">
          Loading Google Places...
        </div>
      )}
    </div>
  );
};

export default AddressAutocompleteInput;
