
import { validateMapEmbedCode } from './inputValidation';

export const extractPreviewUrl = (mapType: 'arcgis' | 'google_my_maps', mapUrl?: string, embedCode?: string): string => {
  if (mapType === 'arcgis' && mapUrl?.trim()) {
    return mapUrl;
  }
  
  if (mapType === 'google_my_maps' && embedCode?.trim()) {
    // Validate the embed code first
    const validation = validateMapEmbedCode(embedCode);
    if (!validation.isValid) {
      console.warn('Invalid embed code:', validation.error);
      return '';
    }
    
    const srcMatch = embedCode.match(/src=['"](https?:\/\/[^'"]+)['"]/i);
    if (srcMatch) {
      return srcMatch[1];
    }
  }
  
  return '';
};

export const validateMapSettings = (settings: { map_type: 'arcgis' | 'google_my_maps'; map_url?: string; embed_code?: string }): string | null => {
  if (settings.map_type === 'arcgis' && !settings.map_url?.trim()) {
    return "Please enter an ArcGIS map URL.";
  }

  if (settings.map_type === 'google_my_maps') {
    if (!settings.embed_code?.trim()) {
      return "Please enter a Google My Maps embed code.";
    }
    
    const validation = validateMapEmbedCode(settings.embed_code);
    if (!validation.isValid) {
      return validation.error || "Invalid Google My Maps embed code.";
    }
  }

  return null;
};
