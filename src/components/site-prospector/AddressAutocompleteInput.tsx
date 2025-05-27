
    ```tsx
    import React from 'react';
    import PlacesAutocomplete, {
      geocodeByAddress,
      getLatLng,
    } from 'react-places-autocomplete';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';

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
      initialValue?: string; // For pre-filling the input, not directly used by PlacesAutocomplete value
      error?: string;
    }

    const AddressAutocompleteInput: React.FC<AddressAutocompleteInputProps> = ({
      onAddressSelect,
      label = "Search Address",
      id = "address-autocomplete",
      initialValue = "",
      error,
    }) => {
      const [address, setAddress] = React.useState(initialValue);

      const handleSelect = async (selectedAddress: string) => {
        setAddress(selectedAddress);
        try {
          const results = await geocodeByAddress(selectedAddress);
          if (results && results.length > 0) {
            const latLng = await getLatLng(results[0]);
            
            const components: AddressComponents = {
              addressLine1: '',
              city: '',
              stateProvince: '',
              postalCode: '',
              country: '',
              latitude: latLng.lat,
              longitude: latLng.lng,
            };

            let streetNumber = '';
            let route = '';

            results[0].address_components.forEach((component) => {
              const types = component.types;
              if (types.includes('street_number')) streetNumber = component.long_name;
              if (types.includes('route')) route = component.long_name;
              if (types.includes('locality')) components.city = component.long_name;
              if (types.includes('administrative_area_level_1')) components.stateProvince = component.short_name;
              if (types.includes('postal_code')) components.postalCode = component.long_name;
              if (types.includes('country')) components.country = component.long_name;
            });
            
            components.addressLine1 = `${streetNumber} ${route}`.trim();
             // Fallback if street_number or route is not directly found
            if (!components.addressLine1 && results[0].formatted_address) {
                const formattedAddressParts = results[0].formatted_address.split(',');
                if (formattedAddressParts.length > 0) {
                    components.addressLine1 = formattedAddressParts[0].trim();
                }
            }

            onAddressSelect(components);
          }
        } catch (error) {
          console.error('Error selecting address:', error);
          // Potentially set an error state to show to the user
        }
      };

      return (
        <PlacesAutocomplete
          value={address}
          onChange={setAddress}
          onSelect={handleSelect}
          searchOptions={{ componentRestrictions: { country: ['us', 'ca'] } }} // Restrict to US and Canada
        >
          {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
            <div className="relative">
              {label && <Label htmlFor={id}>{label}</Label>}
              <Input
                id={id}
                {...getInputProps({
                  placeholder: 'Start typing an address...',
                  className: `location-search-input ${error ? 'border-destructive' : ''}`,
                })}
              />
              {error && <p className="text-sm text-destructive mt-1">{error}</p>}
              {suggestions.length > 0 && (
                <div className="autocomplete-dropdown-container absolute z-50 w-full border bg-card shadow-lg rounded-md mt-1">
                  {loading && <div className="p-2 text-muted-foreground">Loading...</div>}
                  {suggestions.map(suggestion => {
                    const className = suggestion.active
                      ? 'suggestion-item--active p-2 bg-accent cursor-pointer'
                      : 'suggestion-item p-2 hover:bg-accent/50 cursor-pointer';
                    return (
                      <div
                        {...getSuggestionItemProps(suggestion, {
                          className,
                        })}
                        key={suggestion.placeId}
                      >
                        <span>{suggestion.description}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </PlacesAutocomplete>
      );
    };

    export default AddressAutocompleteInput;
    ```
    