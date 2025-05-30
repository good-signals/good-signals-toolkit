
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface TreasureMapSettings {
  map_type: 'arcgis' | 'google_my_maps';
  map_url?: string;
  embed_code?: string;
}

interface MapInputFieldsProps {
  settings: TreasureMapSettings;
  onInputChange: (field: keyof TreasureMapSettings, value: string) => void;
}

const MapInputFields: React.FC<MapInputFieldsProps> = ({ settings, onInputChange }) => {
  if (settings.map_type === 'arcgis') {
    return (
      <div className="space-y-2">
        <Label htmlFor="map_url">ArcGIS Map URL</Label>
        <Input
          id="map_url"
          type="url"
          placeholder="https://example.maps.arcgis.com/apps/..."
          value={settings.map_url || ''}
          onChange={(e) => onInputChange('map_url', e.target.value)}
        />
        <p className="text-sm text-muted-foreground">
          Enter the full URL of your ArcGIS web map or web app.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="embed_code">Google My Maps Embed Code</Label>
      <Textarea
        id="embed_code"
        placeholder='<iframe src="https://www.google.com/maps/d/embed?mid=..." width="640" height="480"></iframe>'
        value={settings.embed_code || ''}
        onChange={(e) => onInputChange('embed_code', e.target.value)}
        rows={4}
      />
      <p className="text-sm text-muted-foreground">
        Paste the full embed code from Google My Maps (including the iframe tags).
      </p>
    </div>
  );
};

export default MapInputFields;
