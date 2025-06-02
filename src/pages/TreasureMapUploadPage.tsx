
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MapTypeSelector from '@/components/treasure-map/MapTypeSelector';
import MapInputFields from '@/components/treasure-map/MapInputFields';
import MapPreview from '@/components/treasure-map/MapPreview';
import { useTreasureMapSettings } from '@/hooks/useTreasureMapSettings';
import { validateMapSettings } from '@/utils/mapUrlExtractor';

const TreasureMapUploadPage = () => {
  const navigate = useNavigate();
  const { settings, setSettings, isLoading, saveSettings } = useTreasureMapSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const handleSave = async () => {
    const validationError = validateMapSettings(settings);
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    const success = await saveSettings(settings);
    if (success) {
      navigate('/toolkit/site-treasure-map');
    }
    setIsSaving(false);
  };

  const handleMapTypeChange = (newType: 'arcgis' | 'google_my_maps') => {
    setSettings(prev => ({
      ...prev,
      map_type: newType
    }));
    setPreviewUrl('');
  };

  const handleAutoPreview = (url: string) => {
    console.log('Auto-preview triggered with URL:', url);
    setPreviewUrl(url);
  };

  const handleInputChange = (field: keyof typeof settings, value: string) => {
    console.log('Input changed:', field, value?.substring(0, 50));
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
          <h1 className="text-3xl font-bold">Configure Treasure Map</h1>
          <p className="text-muted-foreground">Upload and configure your organization's treasure map</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Map Configuration</CardTitle>
            <CardDescription>
              Choose between ArcGIS maps or Google My Maps and provide the necessary information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <MapTypeSelector
              value={settings.map_type}
              onChange={handleMapTypeChange}
            />

            <MapInputFields
              settings={settings}
              onInputChange={handleInputChange}
              onAutoPreview={handleAutoPreview}
            />

            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <MapPreview previewUrl={previewUrl} />
      </div>
    </div>
  );
};

export default TreasureMapUploadPage;
