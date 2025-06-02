
import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';

interface AddressMapDisplayProps {
  latitude: number;
  longitude: number;
}

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps: () => void;
  }
}

const AddressMapDisplay: React.FC<AddressMapDisplayProps> = ({ latitude, longitude }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [mapState, setMapState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);

  console.log('AddressMapDisplay initializing with coordinates:', { latitude, longitude });

  // Initialize Google Maps API loading
  useEffect(() => {
    let isMounted = true;

    const checkAndLoadGoogleMaps = () => {
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        console.log('Google Maps already loaded for map display');
        if (isMounted) {
          setIsGoogleLoaded(true);
        }
        return;
      }

      // Create global callback
      window.initGoogleMaps = () => {
        console.log('Google Maps API loaded for map display');
        if (isMounted) {
          setIsGoogleLoaded(true);
        }
      };

      // Check if script already exists
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        console.log('Google Maps script already exists, waiting for load...');
        
        // Check periodically if it's loaded
        const checkInterval = setInterval(() => {
          if (window.google && window.google.maps) {
            console.log('Google Maps loaded via existing script');
            clearInterval(checkInterval);
            if (isMounted) {
              setIsGoogleLoaded(true);
            }
          }
        }, 100);

        // Cleanup after timeout
        setTimeout(() => {
          clearInterval(checkInterval);
          if (!window.google || !window.google.maps) {
            console.error('Google Maps failed to load within timeout');
            if (isMounted) {
              setMapState('error');
            }
          }
        }, 30000);
        return;
      }

      // Load script if it doesn't exist
      console.log('Loading Google Maps script for map display...');
      const script = document.createElement('script');
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCYg8pkH1rO2z8p6YtsocdhG0s-FKInCnU';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;
      
      script.onerror = (error) => {
        console.error('Failed to load Google Maps API script:', error);
        if (isMounted) {
          setMapState('error');
        }
      };
      
      document.head.appendChild(script);

      // Set timeout for loading
      setTimeout(() => {
        if (!window.google || !window.google.maps) {
          console.error('Google Maps loading timeout');
          if (isMounted) {
            setMapState('error');
          }
        }
      }, 30000);
    };

    checkAndLoadGoogleMaps();

    return () => {
      isMounted = false;
      if (window.initGoogleMaps) {
        delete window.initGoogleMaps;
      }
    };
  }, []);

  // Initialize map when Google Maps is loaded
  useEffect(() => {
    if (!isGoogleLoaded || !mapContainerRef.current || !window.google?.maps) {
      return;
    }

    try {
      console.log('Initializing Google Map with coordinates:', { latitude, longitude });
      const mapCenter = { lat: latitude, lng: longitude };

      // Initialize map
      mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
        center: mapCenter,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: 'cooperative',
      });

      // Add marker
      markerRef.current = new window.google.maps.Marker({
        position: mapCenter,
        map: mapRef.current,
        title: 'Selected Location',
        animation: google.maps.Animation.DROP,
      });
      
      console.log('Google Map initialized successfully');
      setMapState('loaded');
    } catch (error) {
      console.error('Error initializing Google Map:', error);
      setMapState('error');
    }
  }, [isGoogleLoaded, latitude, longitude]);

  // Update map when coordinates change
  useEffect(() => {
    if (mapState === 'loaded' && mapRef.current && markerRef.current && isGoogleLoaded) {
      console.log('Updating Google Map with new coordinates:', { latitude, longitude });
      const mapCenter = { lat: latitude, lng: longitude };
      
      mapRef.current.setCenter(mapCenter);
      mapRef.current.setZoom(15);
      markerRef.current.setPosition(mapCenter);
    }
  }, [latitude, longitude, mapState, isGoogleLoaded]);

  return (
    <div className="relative w-full h-[300px] rounded-md border bg-gray-50 overflow-hidden">
      {/* Map container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
      
      {/* Loading overlay */}
      {(mapState === 'loading' || !isGoogleLoaded) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
          <div className="flex items-center space-x-2 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading interactive map...</span>
          </div>
        </div>
      )}
      
      {/* Error overlay */}
      {mapState === 'error' && isGoogleLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 text-gray-600 p-4 z-10">
          <MapPin className="h-8 w-8 mb-2" />
          <p className="text-sm text-center mb-1">Interactive Map Unavailable</p>
          <p className="text-xs text-center text-gray-500">
            Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </p>
          <p className="text-xs text-center text-gray-400 mt-2">
            Unable to load Google Maps
          </p>
        </div>
      )}
    </div>
  );
};

export default AddressMapDisplay;
