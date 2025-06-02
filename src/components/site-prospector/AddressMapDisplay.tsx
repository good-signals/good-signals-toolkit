
import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';

interface AddressMapDisplayProps {
  latitude: number;
  longitude: number;
}

declare global {
  interface Window {
    google: typeof google;
    initGoogleMapsForDisplay: () => void;
  }
}

const AddressMapDisplay: React.FC<AddressMapDisplayProps> = ({ latitude, longitude }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [mapState, setMapState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  console.log('AddressMapDisplay initializing with coordinates:', { latitude, longitude });

  // Initialize Google Maps API loading
  useEffect(() => {
    let isMounted = true;
    let checkInterval: NodeJS.Timeout;

    const checkGoogleMapsLoaded = () => {
      if (window.google && window.google.maps && window.google.maps.Map) {
        console.log('Google Maps already loaded for map display');
        if (isMounted) {
          setIsGoogleLoaded(true);
          setErrorMessage('');
        }
        return true;
      }
      return false;
    };

    // First check if it's already loaded
    if (checkGoogleMapsLoaded()) {
      return;
    }

    // Create global callback function with unique name for map display
    window.initGoogleMapsForDisplay = () => {
      console.log('Google Maps API loaded for map display');
      if (isMounted && checkGoogleMapsLoaded()) {
        setIsGoogleLoaded(true);
        setErrorMessage('');
      }
    };

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]') as HTMLScriptElement;
    if (existingScript) {
      console.log('Google Maps script already exists for map display, waiting for load...');
      
      // Check periodically if it's loaded
      checkInterval = setInterval(() => {
        if (checkGoogleMapsLoaded() && isMounted) {
          clearInterval(checkInterval);
        }
      }, 200);

      // Cleanup after timeout
      setTimeout(() => {
        if (checkInterval) clearInterval(checkInterval);
        if (!window.google || !window.google.maps) {
          console.error('Google Maps failed to load within timeout for map display');
          if (isMounted) {
            setMapState('error');
            setErrorMessage('Google Maps API failed to load');
          }
        }
      }, 15000);
      return;
    }

    // If no script exists, wait for the autocomplete input to load it
    // The autocomplete component should load the script first
    console.log('Waiting for Google Maps script to be loaded by autocomplete component...');
    checkInterval = setInterval(() => {
      if (checkGoogleMapsLoaded() && isMounted) {
        clearInterval(checkInterval);
      }
    }, 500);

    // Cleanup after timeout
    setTimeout(() => {
      if (checkInterval) clearInterval(checkInterval);
      if (!window.google || !window.google.maps) {
        console.error('Google Maps not available for map display');
        if (isMounted) {
          setMapState('error');
          setErrorMessage('Google Maps API not available');
        }
      }
    }, 20000);

    return () => {
      isMounted = false;
      if (checkInterval) {
        clearInterval(checkInterval);
      }
      if (window.initGoogleMapsForDisplay) {
        delete window.initGoogleMapsForDisplay;
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

      // Clear any existing map
      if (mapRef.current) {
        console.log('Clearing existing map instance');
      }

      // Initialize map
      mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
        center: mapCenter,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: 'cooperative',
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      // Add marker
      markerRef.current = new window.google.maps.Marker({
        position: mapCenter,
        map: mapRef.current,
        title: 'Selected Location',
        animation: google.maps.Animation.DROP,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#ef4444"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(24, 24),
          anchor: new google.maps.Point(12, 24)
        }
      });
      
      console.log('Google Map initialized successfully');
      setMapState('loaded');
      setErrorMessage('');
    } catch (error) {
      console.error('Error initializing Google Map:', error);
      setMapState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to initialize map');
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
      {mapState === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 text-gray-600 p-4 z-10">
          <MapPin className="h-8 w-8 mb-2" />
          <p className="text-sm text-center mb-1">Interactive Map Unavailable</p>
          <p className="text-xs text-center text-gray-500">
            Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </p>
          {errorMessage && (
            <p className="text-xs text-center text-gray-400 mt-2">
              {errorMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default AddressMapDisplay;
