
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
  const [mapState, setMapState] = useState<'loading' | 'google-maps' | 'error'>('loading');
  const timeoutRef = useRef<number | null>(null);
  const initRetryRef = useRef<number>(0);

  console.log('AddressMapDisplay initializing with coordinates:', { latitude, longitude });

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Load Google Maps JavaScript API and initialize map
  useEffect(() => {
    let isMounted = true;

    const waitForContainer = (callback: () => void, retries = 0): void => {
      if (!isMounted) return;
      
      if (mapContainerRef.current && mapContainerRef.current.offsetHeight > 0) {
        console.log('Map container found and ready');
        callback();
      } else if (retries < 10) {
        console.log(`Map container not ready, retrying... (${retries + 1}/10)`);
        setTimeout(() => waitForContainer(callback, retries + 1), 100);
      } else {
        console.error('Map container never became available after 10 retries');
        if (isMounted) {
          setMapState('error');
        }
      }
    };

    const initializeGoogleMap = () => {
      console.log('Starting map initialization...');
      
      waitForContainer(() => {
        if (!isMounted || !mapContainerRef.current) return;

        try {
          console.log('Initializing Google Maps with coordinates:', { latitude, longitude });
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
          if (isMounted) {
            setMapState('google-maps');
          }
        } catch (error) {
          console.error('Error initializing Google Maps:', error);
          if (isMounted) {
            setMapState('error');
          }
        }
      });
    };

    const loadGoogleMaps = () => {
      console.log('Starting Google Maps load process...');
      
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        console.log('Google Maps already loaded, initializing map...');
        initializeGoogleMap();
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        console.log('Google Maps script already in DOM, waiting for load...');
        const checkLoaded = setInterval(() => {
          if (window.google && window.google.maps) {
            console.log('Google Maps loaded via existing script');
            clearInterval(checkLoaded);
            if (isMounted) {
              initializeGoogleMap();
            }
          }
        }, 100);
        
        timeoutRef.current = window.setTimeout(() => {
          clearInterval(checkLoaded);
          if (!window.google || !window.google.maps) {
            console.error('Google Maps failed to load within timeout');
            if (isMounted) {
              setMapState('error');
            }
          }
        }, 30000);
        return;
      }

      // Create and load the script
      console.log('Creating Google Maps script...');
      const script = document.createElement('script');
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCYg8pkH1rO2z8p6YtsocdhG0s-FKInCnU';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('Google Maps API script loaded successfully');
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        if (isMounted) {
          initializeGoogleMap();
        }
      };
      
      script.onerror = (error) => {
        console.error('Failed to load Google Maps API script:', error);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        if (isMounted) {
          setMapState('error');
        }
      };
      
      timeoutRef.current = window.setTimeout(() => {
        console.error('Google Maps loading timeout after 30 seconds');
        if (isMounted) {
          setMapState('error');
        }
      }, 30000);
      
      document.head.appendChild(script);
    };

    // Start the loading process
    loadGoogleMaps();

    // Cleanup function
    return () => {
      isMounted = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [latitude, longitude]);

  // Update Google Map when coordinates change
  useEffect(() => {
    if (mapState === 'google-maps' && mapRef.current && markerRef.current) {
      console.log('Updating Google Maps with new coordinates:', { latitude, longitude });
      const mapCenter = { lat: latitude, lng: longitude };
      mapRef.current.setCenter(mapCenter);
      markerRef.current.setPosition(mapCenter);
    }
  }, [latitude, longitude, mapState]);

  // Show loading state while attempting to load Google Maps
  if (mapState === 'loading') {
    return (
      <div className="w-full h-[300px] rounded-md border flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading interactive map...</span>
        </div>
      </div>
    );
  }

  // Show Google Maps if loaded successfully
  if (mapState === 'google-maps') {
    console.log('Rendering Google Maps container');
    return <div ref={mapContainerRef} className="w-full h-[300px] rounded-md border" />;
  }

  // Show error placeholder if Google Maps failed to load
  console.log('Rendering error placeholder - Google Maps failed to load');
  return (
    <div className="w-full h-[300px] rounded-md border bg-gray-50 overflow-hidden">
      <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 p-4">
        <MapPin className="h-8 w-8 mb-2" />
        <p className="text-sm text-center mb-1">Interactive Map Unavailable</p>
        <p className="text-xs text-center text-gray-500">
          Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </p>
        <p className="text-xs text-center text-gray-400 mt-2">
          Unable to load Google Maps
        </p>
      </div>
    </div>
  );
};

export default AddressMapDisplay;
