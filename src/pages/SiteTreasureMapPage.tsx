
import React, { useState, useEffect } from 'react';
import { MapPin, Upload, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Loading treasure map...</p>
      </div>
    );
  }

  if (!settings || !mapUrl) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6">
        <MapPin className="h-24 w-24 text-muted-foreground mb-6" />
        <h1 className="text-3xl font-bold text-center mb-4">No Treasure Map Configured</h1>
        <p className="text-lg text-muted-foreground text-center mb-8 max-w-md">
          Upload your first treasure map to start exploring strategic location insights
        </p>
        <Button onClick={() => navigate('/treasure-map-upload')} size="lg" className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Treasure Map
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-3">
          <MapPin className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-primary">Site Treasure Map</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <a 
            href={mapUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Open in new tab
          </a>
        </div>
      </div>

      {/* Map Display */}
      <div className="flex-1 w-full">
        <iframe
          src={mapUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Site Treasure Map"
          className="w-full h-full"
        />
      </div>
    </div>
  );
};

export default SiteTreasureMapPage;
