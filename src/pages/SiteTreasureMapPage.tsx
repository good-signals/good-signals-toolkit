
import React, { useState, useEffect } from 'react';
import { MapPin, Settings, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getUserAccountId } from '@/services/targetMetrics/accountHelpers';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface TreasureMapSettings {
  map_type: 'arcgis' | 'google_my_maps';
  map_url?: string;
  embed_code?: string;
}

const SiteTreasureMapPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<TreasureMapSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapUrl, setMapUrl] = useState<string>('');

  useEffect(() => {
    loadMapSettings();
  }, [user]);

  const loadMapSettings = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const accountId = await getUserAccountId(user.id);
      if (!accountId) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('treasure_map_settings')
        .select('*')
        .eq('account_id', accountId)
        .maybeSingle();

      if (error) {
        console.error('Error loading treasure map settings:', error);
        toast({
          title: "Error",
          description: "Failed to load map settings.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (data) {
        const mapSettings: TreasureMapSettings = {
          map_type: data.map_type as 'arcgis' | 'google_my_maps',
          map_url: data.map_url || undefined,
          embed_code: data.embed_code || undefined
        };
        
        setSettings(mapSettings);

        // Extract URL for display
        if (mapSettings.map_type === 'arcgis' && mapSettings.map_url) {
          setMapUrl(mapSettings.map_url);
        } else if (mapSettings.map_type === 'google_my_maps' && mapSettings.embed_code) {
          const srcMatch = mapSettings.embed_code.match(/src="([^"]+)"/);
          if (srcMatch) {
            setMapUrl(srcMatch[1]);
          }
        }
      }
    } catch (error) {
      console.error('Error loading map settings:', error);
      toast({
        title: "Error",
        description: "Failed to load map settings.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigureMap = () => {
    navigate('/treasure-map-settings');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Loading treasure map...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MapPin size={48} className="text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-primary">Site Treasure Map</h1>
            <p className="text-lg text-foreground/80">
              Explore your organization's strategic location insights
            </p>
          </div>
        </div>
        
        <Button onClick={handleConfigureMap} variant="outline" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Configure Map
        </Button>
      </div>

      {settings && mapUrl ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                {settings.map_type === 'arcgis' ? 'ArcGIS Map' : 'Google My Maps'}
              </span>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ExternalLink className="h-4 w-4" />
                <a 
                  href={mapUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  Open in new tab
                </a>
              </div>
            </CardTitle>
            <CardDescription>
              Interactive map showing strategic locations and insights
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <iframe
              src={mapUrl}
              width="100%"
              height="600"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="rounded-b-lg"
              title="Site Treasure Map"
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Map Configured</CardTitle>
            <CardDescription>
              Configure your treasure map to start exploring strategic location insights
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-12">
            <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground mb-6">
              Set up your ArcGIS map or Google My Maps to visualize your data
            </p>
            <Button onClick={handleConfigureMap} className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configure Treasure Map
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SiteTreasureMapPage;
