
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
  const [mapState, setMapState] = useState<'loading' | 'google-maps' | 'static-map' | 'placeholder' | 'error'>('loading');
  const [staticMapUrl, setStaticMapUrl] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  console.log('AddressMapDisplay state:', { 
    mapState, 
    hasStaticMapUrl: !!staticMapUrl,
    coordinates: { latitude, longitude }
  });

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Primary: Load Google Maps JavaScript API with timeout
  useEffect(() => {
    const loadGoogleMaps = () => {
      console.log('Starting Google Maps load process (priority mode)...');
      
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        console.log('Google Maps already loaded, initializing...');
        initializeGoogleMap();
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        console.log('Google Maps script already in DOM, waiting for load...');
        // Wait for it to load with timeout
        const checkLoaded = setInterval(() => {
          if (window.google && window.google.maps) {
            console.log('Google Maps loaded via existing script');
            clearInterval(checkLoaded);
            initializeGoogleMap();
          }
        }, 100);
        
        // Set timeout to fallback to static map
        timeoutRef.current = window.setTimeout(() => {
          clearInterval(checkLoaded);
          if (!window.google || !window.google.maps) {
            console.warn('Google Maps failed to load within timeout, falling back to static map');
            fallbackToStaticMap();
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
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        initializeGoogleMap();
      };
      
      script.onerror = (error) => {
        console.error('Failed to load Google Maps API:', error);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        fallbackToStaticMap();
      };
      
      // Set timeout to fallback to static map
      timeoutRef.current = window.setTimeout(() => {
        console.warn('Google Maps loading timeout, falling back to static map');
        fallbackToStaticMap();
      }, 10000);
      
      document.head.appendChild(script);
    };

    const initializeGoogleMap = () => {
      if (!mapContainerRef.current) {
        console.error('Map container not found, falling back to static map');
        fallbackToStaticMap();
        return;
      }

      try {
        console.log('Initializing Google Maps...');
        const mapCenter = { lat: latitude, lng: longitude };

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
        setMapState('google-maps');
      } catch (error) {
        console.error('Error initializing Google Maps:', error);
        fallbackToStaticMap();
      }
    };

    const fallbackToStaticMap = () => {
      console.log('Falling back to static map generation...');
      setMapState('loading'); // Show loading while generating static map
      generateStaticMap();
    };

    loadGoogleMaps();
  }, [latitude, longitude]);

  // Secondary: Generate static map only as fallback
  const generateStaticMap = async () => {
    console.log('Generating static map as fallback...');
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
        setMapState('static-map');
      } else {
        console.error('Static map generation failed:', response.status, response.statusText);
        setMapState('placeholder');
      }
    } catch (error) {
      console.error('Failed to generate static map:', error);
      setMapState('placeholder');
    }
  };

  // Update Google Map when coordinates change
  useEffect(() => {
    if (mapState === 'google-maps' && mapRef.current && markerRef.current) {
      console.log('Updating Google Maps with new coordinates');
      const mapCenter = { lat: latitude, lng: longitude };
      mapRef.current.setCenter(mapCenter);
      markerRef.current.setPosition(mapCenter);
    }
  }, [latitude, longitude, mapState]);

  // Show loading state only while attempting to load Google Maps
  if (mapState === 'loading') {
    return (
      <div className="w-full h-[300px] rounded-md border flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading map...</span>
        </div>
      </div>
    );
  }

  // Show Google Maps if loaded successfully
  if (mapState === 'google-maps') {
    console.log('Rendering Google Maps container');
    return <div ref={mapContainerRef} className="w-full h-[300px] rounded-md border" />;
  }

  // Show static map if Google Maps failed but static map succeeded
  if (mapState === 'static-map' && staticMapUrl) {
    console.log('Rendering static map fallback');
    return (
      <div className="w-full h-[300px] rounded-md border bg-gray-50 overflow-hidden">
        <img 
          src={staticMapUrl} 
          alt={`Map showing location at ${latitude}, ${longitude}`}
          className="w-full h-full object-cover"
          onLoad={() => console.log('Static map image loaded successfully')}
          onError={() => {
            console.error('Static map image failed to load, showing placeholder');
            setMapState('placeholder');
          }}
        />
      </div>
    );
  }

  // Show placeholder if both Google Maps and static map failed
  console.log('Rendering coordinate placeholder fallback');
  return (
    <div className="w-full h-[300px] rounded-md border bg-gray-50 overflow-hidden">
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
    </div>
  );
};

export default AddressMapDisplay;
