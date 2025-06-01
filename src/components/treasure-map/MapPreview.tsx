
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface MapPreviewProps {
  isLoading: boolean;
  url?: string;
  embedCode?: string;
}

const MapPreview: React.FC<MapPreviewProps> = ({
  isLoading,
  url,
  embedCode,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Map Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!url && !embedCode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Map Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>Configure and generate a map to see preview</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Map Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 border rounded-md overflow-hidden">
          {embedCode ? (
            <div dangerouslySetInnerHTML={{ __html: embedCode }} />
          ) : url ? (
            <iframe 
              src={url} 
              className="w-full h-full border-0"
              title="Map Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>No map data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MapPreview;
