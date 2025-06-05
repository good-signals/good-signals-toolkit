import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, AlertCircle } from 'lucide-react';
import { getValidatedEnvVar } from '@/utils/apiKeyValidation';

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

  // Load Google Maps API script independently
  useEffect(() => {
    let isMounted = true;
    let loadingTimeout: NodeJS.Timeout;

    const checkGoogleMapsLoaded = () => {
      return window.google && window.google.maps && window.google.maps.Map;
    };

    const initializeGoogleMaps = () => {
      console.log('Google Maps API loaded for map display');
      if (isMounted && checkGoogleMapsLoaded()) {
        setIsGoogleLoaded(true);
        setErrorMessage('');
      }
    };

    // Check if Google Maps is already loaded
    if (checkGoogleMapsLoaded()) {
      console.log('Google Maps already loaded for map display');
      setIsGoogleLoaded(true);
      setErrorMessage('');
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log('Google Maps script already exists, waiting for load...');
      
      // Set up callback for when it loads
      window.initGoogleMapsForDisplay = initializeGoogleMaps;
      
      // Check periodically if it's loaded
      const checkInterval = setInterval(() => {
        if (checkGoogleMapsLoaded() && isMounted) {
          clearInterval(checkInterval);
          initializeGoogleMaps();
        }
      }, 200);

      loadingTimeout = setTimeout(() => {
        clearInterval(checkInterval);
        if (!checkGoogleMapsLoaded() && isMounted) {
          console.error('Google Maps failed to load within timeout');
          setMapState('error');
          setErrorMessage('Google Maps API failed to load');
        }
      }, 15000);

      return () => {
        clearInterval(checkInterval);
        if (loadingTimeout) clearTimeout(loadingTimeout);
      };
    }

    // Load Google Maps script if it doesn't exist
    console.log('Loading Google Maps API script for map display...');
    
    // Set up callback
    window.initGoogleMapsForDisplay = initializeGoogleMaps;

    const script = document.createElement('script');
    // Use hardcoded API key - this will be replaced by the actual key from Supabase secrets
    const apiKey = 'AIzaSyBK5lTj9GF8QH2vX_pL3mR7nY4oE1sW6dC';
    
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMapsForDisplay&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      if (isMounted) {
        setMapState('error');
        setErrorMessage('Failed to load Google Maps API script');
      }
    };

    document.head.appendChild(script);

    loadingTimeout = setTimeout(() => {
      if (!checkGoogleMapsLoaded() && isMounted) {
        console.error('Google Maps API failed to load within timeout');
        setMapState('error');
        setErrorMessage('Google Maps API failed to load within timeout');
      }
    }, 15000);

    return () => {
      isMounted = false;
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
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
        title: 'Assessment Location',
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
          <AlertCircle className="h-8 w-8 mb-2 text-red-500" />
          <p className="text-sm text-center mb-1 font-medium">Map Unavailable</p>
          <p className="text-xs text-center text-gray-500 mb-2">
            Location: {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </p>
          {errorMessage && (
            <p className="text-xs text-center text-red-400 bg-red-50 px-2 py-1 rounded">
              {errorMessage}
            </p>
          )}
          <div className="flex items-center mt-2 text-xs text-gray-400">
            <MapPin className="h-3 w-3 mr-1" />
            Static coordinates displayed above
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressMapDisplay;
