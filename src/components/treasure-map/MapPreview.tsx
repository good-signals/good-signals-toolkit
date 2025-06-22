
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export interface MapPreviewProps {
  previewUrl: string;
}

const MapPreview: React.FC<MapPreviewProps> = ({ previewUrl }) => {
  console.log('MapPreview rendered with URL:', previewUrl);

  return (
    <Card>
      <CardContent className="p-6">
        {previewUrl ? (
          <div className="aspect-video">
            <iframe
              src={previewUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              style={{ border: 0 }}
              allowFullScreen
              aria-hidden="false"
              tabIndex={0}
              onLoad={() => console.log('Iframe loaded successfully')}
              onError={() => console.error('Iframe failed to load')}
            />
          </div>
        ) : (
          <div className="aspect-video bg-muted flex items-center justify-center">
            <p className="text-muted-foreground">No preview available</p>
            <p className="text-xs text-muted-foreground mt-2">Click "Preview" to generate map preview</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MapPreview;
