
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';

interface MapPreviewProps {
  previewUrl: string;
}

const MapPreview: React.FC<MapPreviewProps> = ({ previewUrl }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Map Preview</CardTitle>
        <CardDescription>
          Preview how your map will appear on the Site Treasure Map page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {previewUrl ? (
          <div className="space-y-3">
            <iframe
              src={previewUrl}
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="rounded-lg"
            />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ExternalLink className="h-4 w-4" />
              <a 
                href={previewUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Open in new tab
              </a>
            </div>
          </div>
        ) : (
          <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">No map configured yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MapPreview;
