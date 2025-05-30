
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getUserAccountId } from '@/services/targetMetrics/accountHelpers';
import { MapPin, Upload, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TreasureMapSettings {
  map_type: 'arcgis' | 'google_my_maps';
  map_url?: string;
  embed_code?: string;
}

const TreasureMapSettingsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<TreasureMapSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const accountId = await getUserAccountId(user.id);
      if (!accountId) {
        toast({
          title: "Error",
          description: "Could not find account information.",
          variant: "destructive",
        });
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
        const loadedSettings: TreasureMapSettings = {
          map_type: data.map_type as 'arcgis' | 'google_my_maps',
          map_url: data.map_url || undefined,
          embed_code: data.embed_code || undefined
        };
        setSettings(loadedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
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
        <p>Loading treasure map settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <MapPin className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Treasure Map Settings</h1>
          <p className="text-muted-foreground">Manage your organization's treasure map configuration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Map Status */}
        <Card>
          <CardHeader>
            <CardTitle>Current Map Configuration</CardTitle>
            <CardDescription>
              View your current treasure map setup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Map Type</p>
                  <p className="text-lg">
                    {settings.map_type === 'arcgis' ? 'ArcGIS Map' : 'Google My Maps'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <p className="text-lg text-green-600">Map Configured</p>
                </div>
                <div className="pt-4">
                  <Button 
                    onClick={() => navigate('/toolkit/site-treasure-map')}
                    variant="outline"
                    className="w-full"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View Treasure Map
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No map configured yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Map Management */}
        <Card>
          <CardHeader>
            <CardTitle>Map Management</CardTitle>
            <CardDescription>
              Upload or update your treasure map
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/treasure-map-upload')}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                {settings ? 'Update Map' : 'Upload Map'}
              </Button>
              
              {settings && (
                <Button 
                  onClick={() => navigate('/toolkit/site-treasure-map')}
                  variant="outline"
                  className="w-full"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Current Map
                </Button>
              )}
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Supported formats: ArcGIS web maps/apps and Google My Maps embed codes.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TreasureMapSettingsPage;
