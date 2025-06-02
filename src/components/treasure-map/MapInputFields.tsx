
import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { sanitizeMapEmbedCode, validateMapEmbedCode } from '@/utils/inputValidation';
import { extractPreviewUrl } from '@/utils/mapUrlExtractor';

export interface MapInputFieldsProps {
  settings: {
    map_type: 'arcgis' | 'google_my_maps';
    map_url?: string;
    embed_code?: string;
  };
  onInputChange: (field: string, value: string) => void;
  onAutoPreview?: (previewUrl: string) => void;
}

const MapInputFields: React.FC<MapInputFieldsProps> = ({ settings, onInputChange, onAutoPreview }) => {
  const [pasteIndicator, setPasteIndicator] = useState<string>('');

  // Auto-preview when embed code or URL changes
  useEffect(() => {
    if (onAutoPreview) {
      const url = extractPreviewUrl(settings.map_type, settings.map_url, settings.embed_code);
      if (url) {
        onAutoPreview(url);
      }
    }
  }, [settings.map_url, settings.embed_code, settings.map_type, onAutoPreview]);

  const handleEmbedCodePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    
    if (!pastedData.trim()) {
      toast({
        title: "Nothing to paste",
        description: "The clipboard appears to be empty.",
        variant: "destructive",
      });
      return;
    }

    // Sanitize the pasted embed code
    const sanitizedCode = sanitizeMapEmbedCode(pastedData);
    
    // Validate the sanitized code
    const validation = validateMapEmbedCode(sanitizedCode);
    
    if (!validation.isValid) {
      toast({
        title: "Invalid embed code",
        description: validation.error || "The pasted content is not a valid Google Maps embed code.",
        variant: "destructive",
      });
      return;
    }

    // Show success indicator
    setPasteIndicator('✓ Embed code pasted successfully');
    setTimeout(() => setPasteIndicator(''), 3000);

    // Update the field with sanitized content
    onInputChange('embed_code', sanitizedCode);
    
    toast({
      title: "Success",
      description: "Google Maps embed code pasted successfully!",
    });
  };

  const handleEmbedCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value !== settings.embed_code) {
      const sanitized = sanitizeMapEmbedCode(value);
      onInputChange('embed_code', sanitized);
    }
  };

  return (
    <div className="space-y-4">
      {settings.map_type === 'arcgis' && (
        <div>
          <Label htmlFor="map_url">ArcGIS Map URL</Label>
          <Input
            id="map_url"
            value={settings.map_url || ''}
            onChange={(e) => onInputChange('map_url', e.target.value)}
            placeholder="https://your-arcgis-map-url"
          />
        </div>
      )}
      
      {settings.map_type === 'google_my_maps' && (
        <div>
          <Label htmlFor="embed_code">Google My Maps Embed Code</Label>
          <div className="space-y-2">
            <Textarea
              id="embed_code"
              value={settings.embed_code || ''}
              onChange={handleEmbedCodeChange}
              onPaste={handleEmbedCodePaste}
              placeholder="Paste your Google My Maps embed code here (Ctrl+V or Cmd+V)"
              rows={4}
              className="font-mono text-sm"
            />
            {pasteIndicator && (
              <div className="text-sm text-green-600 font-medium">
                {pasteIndicator}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Tip: Copy the embed code from Google My Maps and paste it directly here
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapInputFields;
