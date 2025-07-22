import React, { useState, useEffect, useRef } from 'react';
import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getGoogleMapsApiKey } from '@/services/googleMapsService';

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
  const [isLoadingApiKey, setIsLoadingApiKey] = useState(true);

  // Check if Google Maps is already loaded and load API key
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

    const loadGoogleMapsScript = async () => {
      try {
        setIsLoadingApiKey(true);
        
        // First check if it's already loaded
        if (checkGoogleMapsLoaded()) {
          setIsLoadingApiKey(false);
          return;
        }

        // Check if script already exists
        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]') as HTMLScriptElement;
        if (existingScript) {
          console.log('[AddressAutocompleteInput] Google Maps script already exists, waiting for load...');
          
          // If script exists but Google isn't loaded yet, wait for it
          checkInterval = setInterval(() => {
            if (checkGoogleMapsLoaded() && isMounted) {
              clearInterval(checkInterval);
              setIsLoadingApiKey(false);
            }
          }, 200);

          // Cleanup after timeout
          setTimeout(() => {
            if (checkInterval) clearInterval(checkInterval);
            if (!window.google || !window.google.maps) {
              console.error('[AddressAutocompleteInput] Google Maps failed to load within timeout');
              if (isMounted) {
                setApiError('Google Maps API failed to load');
                setIsLoadingApiKey(false);
              }
            }
          }, 15000);
          return;
        }

        // Fetch API key from Supabase edge function
        console.log('[AddressAutocompleteInput] Fetching Google Maps API key...');
        const apiKey = await getGoogleMapsApiKey();
        
        if (!apiKey) {
          if (isMounted) {
            setApiError('Unable to load Google Maps API key. Please check your configuration.');
            setIsLoadingApiKey(false);
          }
          return;
        }

        // Create global callback function
        window.initGooglePlaces = () => {
          console.log('[AddressAutocompleteInput] Google Maps API loaded via callback');
          if (isMounted && checkGoogleMapsLoaded()) {
            setIsGoogleLoaded(true);
            setApiError(null);
            setIsLoadingApiKey(false);
          }
        };

        // Load script with the fetched API key
        console.log('[AddressAutocompleteInput] Loading Google Maps script...');
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlaces`;
        script.async = true;
        script.defer = true;
        
        script.onerror = (error) => {
          console.error('[AddressAutocompleteInput] Failed to load Google Maps API script:', error);
          if (isMounted) {
            setApiError('Failed to load Google Maps API. Please check your API key configuration.');
            setIsLoadingApiKey(false);
          }
        };
        
        document.head.appendChild(script);

        // Set timeout for loading
        setTimeout(() => {
          if (!window.google || !window.google.maps) {
            console.error('[AddressAutocompleteInput] Google Maps loading timeout');
            if (isMounted) {
              setApiError('Google Maps API loading timeout. Please try again.');
              setIsLoadingApiKey(false);
            }
          }
        }, 15000);

      } catch (error) {
        console.error('[AddressAutocompleteInput] Error loading Google Maps:', error);
        if (isMounted) {
          setApiError('Failed to initialize Google Maps. Please try again.');
          setIsLoadingApiKey(false);
        }
      }
    };

    loadGoogleMapsScript();

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

    if (apiError || isLoadingApiKey) {
      console.warn('[AddressAutocompleteInput] Skipping prediction request due to API error or loading:', { apiError, isLoadingApiKey });
      return;
    }

    setLoading(true);
    try {
      const request: google.maps.places.AutocompletionRequest = {
        input: input.trim(),
        componentRestrictions: { country: ['us', 'ca'] },
        types: ['geocode']
      };

      console.log('[AddressAutocompleteInput] Requesting predictions for:', input, 'with request:', request);

      autocompleteService.getPlacePredictions(
        request,
        (results, status) => {
          setLoading(false);
          console.log('[AddressAutocompleteInput] Prediction response:', { 
            status, 
            statusName: google.maps.places.PlacesServiceStatus[status],
            resultsCount: results?.length || 0,
            results: results?.slice(0, 3)
          });
          
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results);
            setApiError(null);
            console.log('[AddressAutocompleteInput] Successfully loaded', results.length, 'predictions');
          } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            setPredictions([]);
            console.log('[AddressAutocompleteInput] No results found for:', input);
          } else {
            console.error('[AddressAutocompleteInput] Places API error:', {
              status,
              statusName: google.maps.places.PlacesServiceStatus[status],
              input
            });
            setPredictions([]);
            
            if (status === google.maps.places.PlacesServiceStatus.REQUEST_DENIED) {
              setApiError('Google Places API access denied. Please check your API key configuration.');
            } else if (status === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {
              setApiError('Google Places API quota exceeded. Please try again later.');
            } else if (status === google.maps.places.PlacesServiceStatus.INVALID_REQUEST) {
              setApiError('Invalid request to Google Places API. Please try a different search term.');
            } else {
              setApiError(`Google Places API error: ${google.maps.places.PlacesServiceStatus[status] || status}`);
            }
          }
        }
      );
    } catch (error) {
      console.error('[AddressAutocompleteInput] Error fetching predictions:', error);
      setLoading(false);
      setPredictions([]);
      setApiError('Failed to fetch address suggestions. Please check your internet connection.');
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
          console.log(`[AddressAutocompleteInput] Place details response:`, {
            status,
            statusName: google.maps.places.PlacesServiceStatus[status],
            result: result ? {
              placeId: result.place_id,
              formattedAddress: result.formatted_address,
              hasGeometry: !!result.geometry,
              componentCount: result.address_components?.length || 0
            } : null
          });

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
            const errorMsg = `Error fetching place details: ${google.maps.places.PlacesServiceStatus[status] || status}`;
            console.error(`[AddressAutocompleteInput] ${errorMsg}`);
            reject(new Error(errorMsg));
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
    apiError,
    isLoadingApiKey
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
    apiError,
    isLoadingApiKey
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
    } else if (isGoogleLoaded && !apiError && !isLoadingApiKey) {
      setShowSuggestions(true);
      // Debounce the API call
      debounceTimeoutRef.current = setTimeout(() => {
        console.log('[AddressAutocompleteInput] Triggering debounced search for:', value);
        getPlacePredictions(value);
      }, 300);
    } else {
      console.warn('[AddressAutocompleteInput] Cannot search - Google not loaded, API error, or loading API key:', { 
        isGoogleLoaded, 
        apiError, 
        isLoadingApiKey 
      });
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
    if (address && predictions.length > 0 && !apiError && !isLoadingApiKey) {
      setShowSuggestions(true);
    } else if (address && isGoogleLoaded && !apiError && !isLoadingApiKey) {
      getPlacePredictions(address);
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    if (!dropdownRef.current?.contains(e.relatedTarget as Node)) {
      setTimeout(() => setShowSuggestions(false), 200);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const getPlaceholderText = () => {
    if (isLoadingApiKey) return "Loading Google Maps...";
    if (apiError) return "Address search unavailable";
    return "Start typing an address...";
  };

  const isInputDisabled = isLoadingApiKey || !!apiError;

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
        placeholder={getPlaceholderText()}
        className={`${error ? 'border-destructive' : ''}`}
        autoComplete="off"
        disabled={isInputDisabled}
      />
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
      {apiError && (
        <p className="text-sm text-destructive mt-1">
          {apiError}
          {apiError.includes('configuration') && (
            <span className="block text-xs mt-1">
              Please check that your Google Maps API key is configured in Supabase and has Places API enabled.
            </span>
          )}
        </p>
      )}
      
      {showSuggestions && isGoogleLoaded && !apiError && !isLoadingApiKey && (predictions.length > 0 || loading) && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full border bg-card shadow-lg rounded-md mt-1 max-h-60 overflow-y-auto"
        >
          {loading && (
            <div className="p-3 text-sm text-muted-foreground">
              Searching for addresses...
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
              No addresses found. Try a different search term.
            </div>
          )}
        </div>
      )}
      
      {isLoadingApiKey && address && (
        <div className="absolute z-50 w-full border bg-card shadow-lg rounded-md mt-1 p-3 text-sm text-muted-foreground">
          Loading Google Maps API...
        </div>
      )}
    </div>
  );
};

export default AddressAutocompleteInput;
