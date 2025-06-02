
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Settings, Upload, Map } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUserAccountsWithAdminRole } from '@/services/accountService';
import { getTreasureMapSettings } from '@/services/treasureMapService';
import { extractPreviewUrl } from '@/utils/mapUrlExtractor';
import { Link } from 'react-router-dom';

const SiteTreasureMapPage: React.FC = () => {
  const { user } = useAuth();
  const [mapUrl, setMapUrl] = useState('');

  const { data: userAccounts } = useQuery({
    queryKey: ['userAccounts', user?.id],
    queryFn: () => user ? fetchUserAccountsWithAdminRole(user.id) : Promise.resolve([]),
    enabled: !!user,
  });

  const { data: treasureMapSettings, isLoading } = useQuery({
    queryKey: ['treasureMapSettings', userAccounts?.[0]?.id],
    queryFn: () => userAccounts?.[0]?.id ? getTreasureMapSettings(userAccounts[0].id) : Promise.resolve(null),
    enabled: !!userAccounts?.[0]?.id,
  });

  useEffect(() => {
    if (treasureMapSettings) {
      const url = extractPreviewUrl(
        treasureMapSettings.map_type,
        treasureMapSettings.map_url,
        treasureMapSettings.embed_code
      );
      setMapUrl(url);
    }
  }, [treasureMapSettings]);

  const hasConfiguredMap = treasureMapSettings && (
    (treasureMapSettings.map_type === 'arcgis' && treasureMapSettings.map_url) ||
    (treasureMapSettings.map_type === 'google_my_maps' && treasureMapSettings.embed_code)
  );

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center h-64">
          <p>Loading treasure map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Site Treasure Map</h1>
        <p className="text-muted-foreground">
          Visualize site opportunities and market data with your interactive treasure map.
        </p>
      </div>

      {hasConfiguredMap ? (
        <div className="space-y-6">
          {/* Display the configured map */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" />
                Your Treasure Map
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mapUrl ? (
                <div className="aspect-video">
                  <iframe
                    src={mapUrl}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    allowFullScreen
                    aria-hidden="false"
                    tabIndex={0}
                  />
                </div>
              ) : (
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <p className="text-muted-foreground">Map configuration found but preview unavailable</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Map Management Actions */}
          <div className="flex gap-4">
            <Link to="/treasure-map-upload">
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Configure Map
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* Show setup prompts when no map is configured */
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Welcome to Site Treasure Map</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Get started by configuring your treasure map. You can upload ArcGIS maps or Google My Maps to visualize your site opportunities.
              </p>
              
              <div className="flex gap-4">
                <Link to="/treasure-map-upload">
                  <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    Configure Your Map
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>ArcGIS Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Connect your existing ArcGIS maps by providing the map URL. Perfect for detailed geographic analysis and professional mapping.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Google My Maps</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Use Google My Maps for easy-to-create custom maps. Simply paste the embed code from your Google My Maps to get started.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteTreasureMapPage;
