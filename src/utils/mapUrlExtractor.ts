
import { validateMapEmbedCode } from './inputValidation';

export const extractPreviewUrl = (mapType: 'arcgis' | 'google_my_maps', mapUrl?: string, embedCode?: string): string => {
  console.log('extractPreviewUrl called with:', { mapType, mapUrl: mapUrl?.substring(0, 50), embedCode: embedCode?.substring(0, 100) });
  
  if (mapType === 'arcgis' && mapUrl?.trim()) {
    console.log('Returning ArcGIS URL:', mapUrl);
    return mapUrl;
  }
  
  if (mapType === 'google_my_maps' && embedCode?.trim()) {
    // Validate the embed code first
    const validation = validateMapEmbedCode(embedCode);
    console.log('Embed code validation result:', validation);
    
    if (!validation.isValid) {
      console.warn('Invalid embed code:', validation.error);
      return '';
    }
    
    // Look for src attribute in iframe - make the regex more flexible
    const srcMatch = embedCode.match(/src\s*=\s*['"](https?:\/\/[^'"]+)['"]/i);
    console.log('Regex match result:', srcMatch);
    
    if (srcMatch) {
      const extractedUrl = srcMatch[1];
      console.log('Extracted URL:', extractedUrl);
      return extractedUrl;
    } else {
      console.warn('No src attribute found in embed code');
    }
  }
  
  console.log('No preview URL could be extracted');
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
