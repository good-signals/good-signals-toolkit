
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Settings, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUserAccountsWithAdminRole } from '@/services/accountService';
import { getTreasureMapSettings, saveTreasureMapSettings } from '@/services/treasureMapService';
import MapInputFields from '@/components/treasure-map/MapInputFields';
import MapPreview from '@/components/treasure-map/MapPreview';

const SiteTreasureMapPage: React.FC = () => {
  const { user } = useAuth();
  const [mapType, setMapType] = useState<'arcgis' | 'google_my_maps'>('arcgis');
  const [isGenerating, setIsGenerating] = useState(false);
  const [mapUrl, setMapUrl] = useState('');
  const [inputs, setInputs] = useState({
    address: '',
    radius: 5,
    cbsaCode: '',
    cbsaName: '',
  });

  const { data: userAccounts } = useQuery({
    queryKey: ['userAccounts', user?.id],
    queryFn: () => user ? fetchUserAccountsWithAdminRole(user.id) : Promise.resolve([]),
    enabled: !!user,
  });

  const { data: treasureMapSettings } = useQuery({
    queryKey: ['treasureMapSettings', userAccounts?.[0]?.id],
    queryFn: () => userAccounts?.[0]?.id ? getTreasureMapSettings(userAccounts[0].id) : Promise.resolve(null),
    enabled: !!userAccounts?.[0]?.id,
  });

  const handleInputChange = (name: string, value: string | number) => {
    setInputs(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Simulate map generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      setMapUrl('https://example.com/generated-map');
      toast({ title: 'Success', description: 'Map generated successfully!' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate map', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Site Treasure Map</h1>
        <p className="text-muted-foreground">
          Generate interactive maps to visualize site opportunities and market data.
        </p>
      </div>

      <div className="space-y-6">
        {/* Map Type Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Map Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={mapType} onValueChange={(value: 'arcgis' | 'google_my_maps') => setMapType(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select map type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="arcgis">ArcGIS</SelectItem>
                <SelectItem value="google_my_maps">Google My Maps</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MapInputFields
            inputs={inputs}
            onChange={handleInputChange}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />

          <MapPreview
            isLoading={isGenerating}
            url={mapUrl}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => window.location.href = '/treasure-map-settings'}>
            <Settings className="mr-2 h-4 w-4" />
            Map Settings
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/treasure-map-upload'}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Data
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SiteTreasureMapPage;
