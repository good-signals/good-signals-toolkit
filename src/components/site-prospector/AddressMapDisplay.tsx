
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
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [staticMapLoaded, setStaticMapLoaded] = useState(false);

  console.log('AddressMapDisplay state:', { 
    isLoading, 
    mapError, 
    googleMapsLoaded, 
    staticMapLoaded, 
    hasStaticMapUrl: !!staticMapUrl 
  });

  // Load Google Maps JavaScript API
  useEffect(() => {
    const loadGoogleMaps = () => {
      console.log('Starting Google Maps load process...');
      
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        console.log('Google Maps already loaded');
        setGoogleMapsLoaded(true);
        setIsLoading(false);
        return;
      }

      // Check if script is already being loaded
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        console.log('Google Maps script already in DOM, waiting for load...');
        // Wait for it to load
        const checkLoaded = setInterval(() => {
          if (window.google && window.google.maps) {
            console.log('Google Maps loaded via existing script');
            setGoogleMapsLoaded(true);
            setIsLoading(false);
            clearInterval(checkLoaded);
          }
        }, 100);
        
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkLoaded);
          if (!window.google || !window.google.maps) {
            console.warn('Google Maps failed to load within timeout');
            setMapError(true);
            setIsLoading(false);
          }
        }, 10000);
        return;
      }

      // Create and load the script
      console.log('Creating Google Maps script...');
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCYg8pkH1rO2z8p6YtsocdhG0s-FKInCnU'}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('Google Maps API loaded successfully');
        setGoogleMapsLoaded(true);
        setIsLoading(false);
      };
      
      script.onerror = (error) => {
        console.error('Failed to load Google Maps API:', error);
        setMapError(true);
        setIsLoading(false);
      };
      
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  // Generate static map as fallback
  useEffect(() => {
    const generateStaticMap = async () => {
      console.log('Generating static map...');
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
          console.log('Static map generated successfully:', data.imageUrl);
          setStaticMapUrl(data.imageUrl);
          setStaticMapLoaded(true);
          
          // If Google Maps hasn't loaded yet, stop loading state
          if (!googleMapsLoaded) {
            setIsLoading(false);
          }
        } else {
          console.error('Static map generation failed:', response.status, response.statusText);
          setStaticMapLoaded(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to generate static map:', error);
        setStaticMapLoaded(true);
        setIsLoading(false);
      }
    };

    generateStaticMap();
  }, [latitude, longitude, googleMapsLoaded]);

  // Initialize Google Maps when API is loaded
  useEffect(() => {
    if (!googleMapsLoaded || !mapContainerRef.current || mapError) {
      return;
    }

    try {
      console.log('Initializing Google Maps...');
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
        
        console.log('Google Maps initialized successfully');
      } else {
        // Update existing map
        mapRef.current.setCenter(mapCenter);
        if (markerRef.current) {
          markerRef.current.setPosition(mapCenter);
        }
        console.log('Google Maps updated successfully');
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing Google Maps:', error);
      setMapError(true);
      setIsLoading(false);
    }
  }, [googleMapsLoaded, latitude, longitude, mapError]);

  // Show loading state only if both Google Maps and static map are still loading
  if (isLoading && !googleMapsLoaded && !staticMapLoaded) {
    return (
      <div className="w-full h-[300px] rounded-md border flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading map...</span>
        </div>
      </div>
    );
  }

  // Show Google Maps if it loaded successfully
  if (googleMapsLoaded && !mapError) {
    console.log('Rendering Google Maps container');
    return <div ref={mapContainerRef} className="w-full h-[300px] rounded-md border" />;
  }

  // Show static map fallback
  console.log('Rendering static map fallback');
  return (
    <div className="w-full h-[300px] rounded-md border bg-gray-50 overflow-hidden">
      {staticMapUrl ? (
        <img 
          src={staticMapUrl} 
          alt={`Map showing location at ${latitude}, ${longitude}`}
          className="w-full h-full object-cover"
          onLoad={() => console.log('Static map image loaded successfully')}
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
            Map temporarily unavailable
          </p>
        </div>
      )}
    </div>
  );
};

export default AddressMapDisplay;
