
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getUserAccountId } from '@/services/targetMetrics/accountHelpers';
import { MapPin, ExternalLink, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TreasureMapSettings {
  map_type: 'arcgis' | 'google_my_maps';
  map_url?: string;
  embed_code?: string;
}

const TreasureMapUploadPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<TreasureMapSettings>({
    map_type: 'arcgis',
    map_url: '',
    embed_code: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');

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
          map_url: data.map_url || '',
          embed_code: data.embed_code || ''
        };
        
        setSettings(loadedSettings);
        
        // Set preview URL based on loaded data
        if (loadedSettings.map_type === 'arcgis' && loadedSettings.map_url) {
          setPreviewUrl(loadedSettings.map_url);
        } else if (loadedSettings.map_type === 'google_my_maps' && loadedSettings.embed_code) {
          const srcMatch = loadedSettings.embed_code.match(/src="([^"]+)"/);
          if (srcMatch) {
            setPreviewUrl(srcMatch[1]);
          }
        }
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

  const handleSave = async () => {
    if (!user) return;

    // Validation
    if (settings.map_type === 'arcgis' && !settings.map_url?.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an ArcGIS map URL.",
        variant: "destructive",
      });
      return;
    }

    if (settings.map_type === 'google_my_maps' && !settings.embed_code?.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a Google My Maps embed code.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const accountId = await getUserAccountId(user.id);
      if (!accountId) {
        toast({
          title: "Error",
          description: "Could not find account information.",
          variant: "destructive",
        });
        return;
      }

      const dataToSave = {
        account_id: accountId,
        map_type: settings.map_type,
        map_url: settings.map_type === 'arcgis' ? settings.map_url : null,
        embed_code: settings.map_type === 'google_my_maps' ? settings.embed_code : null,
      };

      const { error } = await supabase
        .from('treasure_map_settings')
        .upsert(dataToSave, { onConflict: 'account_id' });

      if (error) {
        console.error('Error saving treasure map settings:', error);
        toast({
          title: "Error",
          description: "Failed to save map settings.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Map uploaded successfully!",
      });

      // Navigate to the treasure map page after successful save
      navigate('/toolkit/site-treasure-map');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save map settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMapTypeChange = (newType: 'arcgis' | 'google_my_maps') => {
    setSettings(prev => ({
      ...prev,
      map_type: newType
    }));
    // Clear preview when changing map type
    setPreviewUrl('');
  };

  const handlePreview = () => {
    if (settings.map_type === 'arcgis' && settings.map_url?.trim()) {
      setPreviewUrl(settings.map_url);
    } else if (settings.map_type === 'google_my_maps' && settings.embed_code?.trim()) {
      const srcMatch = settings.embed_code.match(/src="([^"]+)"/);
      if (srcMatch) {
        setPreviewUrl(srcMatch[1]);
      } else {
        toast({
          title: "Invalid Embed Code",
          description: "Could not extract URL from embed code. Please check the format.",
          variant: "destructive",
        });
      }
    }
  };

  const handleInputChange = (field: keyof TreasureMapSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Loading map settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Upload className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Upload Treasure Map</h1>
          <p className="text-muted-foreground">Upload and configure your organization's treasure map</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Form */}
        <Card>
          <CardHeader>
            <CardTitle>Map Upload</CardTitle>
            <CardDescription>
              Choose between ArcGIS maps or Google My Maps and provide the necessary information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-base font-medium">Map Type</Label>
              <RadioGroup
                value={settings.map_type}
                onValueChange={handleMapTypeChange}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="arcgis" id="arcgis" />
                  <Label htmlFor="arcgis">ArcGIS Map URL</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="google_my_maps" id="google_my_maps" />
                  <Label htmlFor="google_my_maps">Google My Maps Embed Code</Label>
                </div>
              </RadioGroup>
            </div>

            {settings.map_type === 'arcgis' && (
              <div className="space-y-2">
                <Label htmlFor="map_url">ArcGIS Map URL</Label>
                <Input
                  id="map_url"
                  type="url"
                  placeholder="https://example.maps.arcgis.com/apps/..."
                  value={settings.map_url || ''}
                  onChange={(e) => handleInputChange('map_url', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Enter the full URL of your ArcGIS web map or web app.
                </p>
              </div>
            )}

            {settings.map_type === 'google_my_maps' && (
              <div className="space-y-2">
                <Label htmlFor="embed_code">Google My Maps Embed Code</Label>
                <Textarea
                  id="embed_code"
                  placeholder='<iframe src="https://www.google.com/maps/d/embed?mid=..." width="640" height="480"></iframe>'
                  value={settings.embed_code || ''}
                  onChange={(e) => handleInputChange('embed_code', e.target.value)}
                  rows={4}
                />
                <p className="text-sm text-muted-foreground">
                  Paste the full embed code from Google My Maps (including the iframe tags).
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handlePreview} variant="outline">
                Preview
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Uploading...' : 'Upload Map'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
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
      </div>
    </div>
  );
};

export default TreasureMapUploadPage;
