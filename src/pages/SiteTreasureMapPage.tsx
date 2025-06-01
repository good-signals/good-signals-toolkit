import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import MapTypeSelector from '@/components/treasure-map/MapTypeSelector';
import MapInputFields from '@/components/treasure-map/MapInputFields';
import MapPreview from '@/components/treasure-map/MapPreview';
import { getAccountSignalThresholds } from '@/services/targetMetrics/accountHelpers';

const SiteTreasureMapPage: React.FC = () => {
  const { user } = useAuth();
  const [mapType, setMapType] = useState<'site' | 'territory'>('site');
  const [mapInputs, setMapInputs] = useState({
    address: '',
    radius: 5,
    cbsaCode: '',
    cbsaName: '',
  });
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get account signal thresholds
  const { goodThreshold, badThreshold } = getAccountSignalThresholds(null);

  const handleMapTypeChange = (type: 'site' | 'territory') => {
    setMapType(type);
    setMapUrl(null);
    setError(null);
  };

  const handleInputChange = (name: string, value: string | number) => {
    setMapInputs(prev => ({
      ...prev,
      [name]: value
    }));
    setMapUrl(null);
    setError(null);
  };

  const generateMap = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Validate inputs
      if (mapType === 'site' && !mapInputs.address) {
        throw new Error('Please enter a valid address');
      }
      if (mapType === 'territory' && !mapInputs.cbsaCode) {
        throw new Error('Please select a valid CBSA');
      }

      // This would normally call an API to generate the map
      // For now, we'll simulate a delay and return a placeholder URL
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
      const apiKey = 'YOUR_API_KEY'; // This would be replaced with an environment variable
      
      let mapUrlValue = '';
      if (mapType === 'site') {
        // Generate a site-specific map URL
        mapUrlValue = `${baseUrl}?center=${encodeURIComponent(mapInputs.address)}&zoom=14&size=600x400&key=${apiKey}`;
      } else {
        // Generate a territory map URL (this is a placeholder)
        mapUrlValue = `${baseUrl}?center=${encodeURIComponent(mapInputs.cbsaName)}&zoom=10&size=600x400&key=${apiKey}`;
      }
      
      setMapUrl(mapUrlValue);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary mb-4">Site Treasure Map</h1>
        <p className="text-lg text-foreground/80 max-w-2xl mx-auto">
          Generate detailed maps for site analysis and territory visualization.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Map Configuration</CardTitle>
              <CardDescription>
                Select map type and enter location details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <MapTypeSelector 
                mapType={mapType} 
                onChange={handleMapTypeChange} 
              />
              
              <MapInputFields 
                mapType={mapType}
                inputs={mapInputs}
                onChange={handleInputChange}
                onGenerate={generateMap}
                isGenerating={isGenerating}
              />
              
              {error && (
                <div className="text-sm text-destructive mt-2">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Map Preview</CardTitle>
              <CardDescription>
                {mapUrl 
                  ? `${mapType === 'site' ? 'Site' : 'Territory'} map for ${mapType === 'site' ? mapInputs.address : mapInputs.cbsaName}`
                  : 'Configure your map settings and generate a preview'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MapPreview 
                mapUrl={mapUrl} 
                isLoading={isGenerating}
                mapType={mapType}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SiteTreasureMapPage;
