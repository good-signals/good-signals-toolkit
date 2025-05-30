
import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface MapTypeSelectorProps {
  value: 'arcgis' | 'google_my_maps';
  onChange: (value: 'arcgis' | 'google_my_maps') => void;
}

const MapTypeSelector: React.FC<MapTypeSelectorProps> = ({ value, onChange }) => {
  return (
    <div>
      <Label className="text-base font-medium">Map Type</Label>
      <RadioGroup
        value={value}
        onValueChange={onChange}
        className="mt-2"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="arcgis" id="arcgis" />
          <Label htmlFor="arcgis">ArcGIS Map URL</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="google_my_maps" id="google_my_maps" />
          <Label htmlFor="google_my_maps">Google My Maps Embed Code</Label>
        </div>
      </RadioGroup>
    </div>
  );
};

export default MapTypeSelector;
