
import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';

interface AddressMapDisplayProps {
  latitude: number;
  longitude: number;
}

const AddressMapDisplay: React.FC<AddressMapDisplayProps> = ({ latitude, longitude }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [mapError, setMapError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [staticMapUrl, setStaticMapUrl] = useState<string | null>(null);

  // Generate static map as fallback
  useEffect(() => {
    const generateStaticMap = async () => {
      try {
        const response = await fetch('https://thfphcgufrygruqoekvz.supabase.co/functions/v1/generate-map-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoZnBoY2d1ZnJ5Z3J1cW9la3Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzMTIwNDEsImV4cCI6MjA2Mzg4ODA0MX0.i10fd7Ix3fTnAFEIVjIw8b9w0R8TPHsSI62Fr61XNto`,
          },
          body: JSON.stringify({
            latitude,
            longitude,
            zoom: 15,
            size: '600x300',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setStaticMapUrl(data.imageUrl);
        }
      } catch (error) {
        console.error('Failed to generate static map:', error);
      }
    };

    generateStaticMap();
  }, [latitude, longitude]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Check if Google Maps is available
    if (typeof window === 'undefined' || !window.google || !window.google.maps) {
      console.warn("Google Maps API not loaded.");
      setMapError(true);
      setIsLoading(false);
      return;
    }

    try {
      const mapCenter = { lat: latitude, lng: longitude };

      if (!mapRef.current) {
        // Initialize map
        mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
          center: mapCenter,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
        });

        // Add marker
        markerRef.current = new window.google.maps.Marker({
          position: mapCenter,
          map: mapRef.current,
          title: 'Selected Location',
        });
      } else {
        // Update existing map
        mapRef.current.setCenter(mapCenter);
        if (markerRef.current) {
          markerRef.current.setPosition(mapCenter);
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing Google Maps:', error);
      setMapError(true);
      setIsLoading(false);
    }
  }, [latitude, longitude]);

  // Show loading state
  if (isLoading && !mapError) {
    return (
      <div className="w-full h-[300px] rounded-md border flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading map...</span>
        </div>
      </div>
    );
  }

  // Show static map fallback if Google Maps failed to load
  if (mapError) {
    return (
      <div className="w-full h-[300px] rounded-md border bg-gray-50 overflow-hidden">
        {staticMapUrl ? (
          <img 
            src={staticMapUrl} 
            alt={`Map showing location at ${latitude}, ${longitude}`}
            className="w-full h-full object-cover"
            onError={() => {
              console.error('Static map image failed to load');
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 p-4">
            <MapPin className="h-8 w-8 mb-2" />
            <p className="text-sm text-center mb-1">Location Map</p>
            <p className="text-xs text-center text-gray-500">
              Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </p>
            <p className="text-xs text-center text-gray-400 mt-2">
              Interactive map unavailable
            </p>
          </div>
        )}
      </div>
    );
  }

  // Render Google Maps container
  return <div ref={mapContainerRef} className="w-full h-[300px] rounded-md border" />;
};

export default AddressMapDisplay;
