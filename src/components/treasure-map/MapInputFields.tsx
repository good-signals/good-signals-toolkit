
import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export interface MapInputFieldsProps {
  settings: {
    map_type: 'arcgis' | 'google_my_maps';
    map_url?: string;
    embed_code?: string;
  };
  onInputChange: (field: string, value: string) => void;
}

const MapInputFields: React.FC<MapInputFieldsProps> = ({ settings, onInputChange }) => {
  return (
    <div className="space-y-4">
      {settings.map_type === 'arcgis' && (
        <div>
          <Label htmlFor="map_url">ArcGIS Map URL</Label>
          <Input
            id="map_url"
            value={settings.map_url || ''}
            onChange={(e) => onInputChange('map_url', e.target.value)}
            placeholder="https://your-arcgis-map-url"
          />
        </div>
      )}
      
      {settings.map_type === 'google_my_maps' && (
        <div>
          <Label htmlFor="embed_code">Google My Maps Embed Code</Label>
          <Textarea
            id="embed_code"
            value={settings.embed_code || ''}
            onChange={(e) => onInputChange('embed_code', e.target.value)}
            placeholder="Paste your Google My Maps embed code here"
            rows={4}
          />
        </div>
      )}
    </div>
  );
};

export default MapInputFields;
