
import React from 'react';
import PlacesAutocomplete, {
  geocodeByAddress,
  getLatLng,
} from 'react-places-autocomplete';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddressAutocompleteInputProps {
  address: string;
  onAddressChange: (address: string) => void;
  onAddressSelect: (addressComponents: {
    addressLine1: string;
    city: string;
    stateProvince: string;
    postalCode: string;
    country: string;
    latitude?: number;
    longitude?: number;
  }) => void;
  label?: string;
  id?: string;
  error?: string;
}

const AddressAutocompleteInput: React.FC<AddressAutocompleteInputProps> = ({
  address,
  onAddressChange,
  onAddressSelect,
  label = "Search Address",
  id = "address-autocomplete",
  error,
}) => {
  const handleSelect = async (selectedAddress: string) => {
    onAddressChange(selectedAddress); // Update the input field with the full selected address

    try {
      const results = await geocodeByAddress(selectedAddress);
      const latLng = await getLatLng(results[0]);

      const addressComponents = {
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

      results[0].address_components.forEach(component => {
        const types = component.types;
        if (types.includes('street_number')) {
          streetNumber = component.long_name;
        }
        if (types.includes('route')) {
          route = component.long_name;
        }
        if (types.includes('locality')) {
          addressComponents.city = component.long_name;
        }
        if (types.includes('administrative_area_level_1')) {
          addressComponents.stateProvince = component.short_name;
        }
        if (types.includes('postal_code')) {
          addressComponents.postalCode = component.long_name;
        }
        if (types.includes('country')) {
          addressComponents.country = component.long_name;
        }
      });
      
      addressComponents.addressLine1 = `${streetNumber} ${route}`.trim();
      if (!addressComponents.addressLine1 && results[0].formatted_address) {
        // Fallback if street number and route are not found, try to parse from formatted_address
        const parts = results[0].formatted_address.split(',');
        if (parts.length > 0) addressComponents.addressLine1 = parts[0].trim();
      }


      onAddressSelect(addressComponents);
    } catch (error) {
      console.error('Error selecting address:', error);
      // Potentially notify user or fallback
    }
  };

  return (
    <PlacesAutocomplete
      value={address}
      onChange={onAddressChange}
      onSelect={handleSelect}
      searchOptions={{ componentRestrictions: { country: ['us', 'ca'] } }} // Example: Restrict to US and CA
    >
      {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
        <div className="relative">
          {label && <Label htmlFor={id}>{label}</Label>}
          <Input
            id={id}
            {...getInputProps({
              placeholder: 'Start typing an address...',
              className: 'location-search-input',
            })}
          />
          {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          <div className="autocomplete-dropdown-container absolute z-10 w-full bg-card border border-border rounded-md shadow-lg mt-1">
            {loading && <div className="p-2 text-muted-foreground">Loading...</div>}
            {suggestions.map(suggestion => {
              const className = suggestion.active
                ? 'suggestion-item--active p-2 bg-accent cursor-pointer'
                : 'suggestion-item p-2 hover:bg-accent/50 cursor-pointer';
              return (
                <div
                  key={suggestion.placeId}
                  {...getSuggestionItemProps(suggestion, {
                    className,
                  })}
                >
                  <span>{suggestion.description}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PlacesAutocomplete>
  );
};

export default AddressAutocompleteInput;
