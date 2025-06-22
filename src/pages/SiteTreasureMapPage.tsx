import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Settings, Upload } from 'lucide-react';
import { useTreasureMapSettings } from '@/hooks/useTreasureMapSettings';
import MapPreview from '@/components/treasure-map/MapPreview';
import { extractPreviewUrl } from '@/utils/mapUrlExtractor';

const SiteTreasureMapPage: React.FC = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const { user, authLoading } = useAuth();
  const { settings, isLoading } = useTreasureMapSettings();
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    if (settings && !isLoading) {
      const url = extractPreviewUrl(settings.map_type, settings.map_url, settings.embed_code);
      console.log('Setting preview URL:', url);
      setPreviewUrl(url);
    }
  }, [settings, isLoading]);

  const handleBackClick = () => {
    navigate('/toolkit-hub');
  };

  const handleConfigureMap = () => {
    navigate('/treasure-map-upload');
  };

  const handleMapSettings = () => {
    navigate('/treasure-map-settings');
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Loading...</p>
      </div>
    );
  }

  // Check if we have map settings configured
  const hasMapConfigured = settings && (
    (settings.map_type === 'arcgis' && settings.map_url?.trim()) ||
    (settings.map_type === 'google_my_maps' && settings.embed_code?.trim())
  );

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-4xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <Button variant="ghost" onClick={handleBackClick}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-primary">Site Treasure Map</h1>
          <p className="text-muted-foreground">
            View and manage your organization's treasure map
          </p>
          {hasMapConfigured && (
            <p className="text-sm text-muted-foreground mt-2">
              Map Type: {settings.map_type === 'arcgis' ? 'ArcGIS' : 'Google My Maps'}
            </p>
          )}
        </div>
        
        {hasMapConfigured && (
          <Button variant="outline" onClick={handleMapSettings}>
            <Settings className="mr-2 h-4 w-4" />
            Map Settings
          </Button>
        )}
      </div>

      {!hasMapConfigured ? (
        // No map configured - show setup options
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              No Treasure Map Configured
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You haven't configured a treasure map yet. Set up your map to visualize key locations and insights.
            </p>
            <div className="flex gap-3">
              <Button onClick={handleConfigureMap}>
                <Upload className="mr-2 h-4 w-4" />
                Configure Map
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Map is configured - show the map viewer
        <div className="space-y-6">
          <MapPreview previewUrl={previewUrl} />

          {siteId && (
            <Card>
              <CardHeader>
                <CardTitle>Site Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Site-specific analysis and metrics would be displayed here for site: {siteId}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default SiteTreasureMapPage;
