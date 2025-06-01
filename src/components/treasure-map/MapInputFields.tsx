
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface MapInputFieldsProps {
  inputs: {
    address: string;
    radius: number;
    cbsaCode: string;
    cbsaName: string;
  };
  onChange: (name: string, value: string | number) => void;
  onGenerate: () => Promise<void>;
  isGenerating: boolean;
}

const MapInputFields: React.FC<MapInputFieldsProps> = ({
  inputs,
  onChange,
  onGenerate,
  isGenerating,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Map Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={inputs.address}
            onChange={(e) => onChange('address', e.target.value)}
            placeholder="Enter address"
          />
        </div>
        
        <div>
          <Label htmlFor="radius">Radius (miles)</Label>
          <Input
            id="radius"
            type="number"
            value={inputs.radius}
            onChange={(e) => onChange('radius', parseInt(e.target.value) || 0)}
            placeholder="Enter radius"
          />
        </div>
        
        <div>
          <Label htmlFor="cbsaCode">CBSA Code</Label>
          <Input
            id="cbsaCode"
            value={inputs.cbsaCode}
            onChange={(e) => onChange('cbsaCode', e.target.value)}
            placeholder="Enter CBSA code"
          />
        </div>
        
        <div>
          <Label htmlFor="cbsaName">CBSA Name</Label>
          <Input
            id="cbsaName"
            value={inputs.cbsaName}
            onChange={(e) => onChange('cbsaName', e.target.value)}
            placeholder="Enter CBSA name"
          />
        </div>
        
        <Button 
          onClick={onGenerate} 
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Generate Map
        </Button>
      </CardContent>
    </Card>
  );
};

export default MapInputFields;
