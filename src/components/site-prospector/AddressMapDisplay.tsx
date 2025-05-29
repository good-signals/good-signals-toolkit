
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
  const [mapState, setMapState] = useState<'loading' | 'loaded' | 'error'>('loading');

  console.log('AddressMapDisplay initializing with coordinates:', { latitude, longitude });

  // Load Google Maps JavaScript API and initialize map
  useEffect(() => {
    let isMounted = true;

    const initializeGoogleMap = () => {
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
          setMapState('loaded');
        }
      } catch (error) {
        console.error('Error initializing Google Maps:', error);
        if (isMounted) {
          setMapState('error');
        }
      }
    };

    const loadGoogleMaps = () => {
      console.log('Starting Google Maps load process...');
      
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        console.log('Google Maps already loaded, initializing map...');
        // Use setTimeout to ensure the component has rendered
        setTimeout(initializeGoogleMap, 0);
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
              setTimeout(initializeGoogleMap, 0);
            }
          }
        }, 100);
        
        setTimeout(() => {
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
        if (isMounted) {
          setTimeout(initializeGoogleMap, 0);
        }
      };
      
      script.onerror = (error) => {
        console.error('Failed to load Google Maps API script:', error);
        if (isMounted) {
          setMapState('error');
        }
      };
      
      setTimeout(() => {
        if (mapState === 'loading') {
          console.error('Google Maps loading timeout after 30 seconds');
          if (isMounted) {
            setMapState('error');
          }
        }
      }, 30000);
      
      document.head.appendChild(script);
    };

    // Start the loading process
    loadGoogleMaps();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [latitude, longitude]);

  // Update Google Map when coordinates change
  useEffect(() => {
    if (mapState === 'loaded' && mapRef.current && markerRef.current) {
      console.log('Updating Google Maps with new coordinates:', { latitude, longitude });
      const mapCenter = { lat: latitude, lng: longitude };
      mapRef.current.setCenter(mapCenter);
      markerRef.current.setPosition(mapCenter);
    }
  }, [latitude, longitude, mapState]);

  return (
    <div className="relative w-full h-[300px] rounded-md border bg-gray-50 overflow-hidden">
      {/* Map container - always rendered */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
      
      {/* Loading overlay */}
      {mapState === 'loading' && (
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
          <p className="text-xs text-center text-gray-400 mt-2">
            Unable to load Google Maps
          </p>
        </div>
      )}
    </div>
  );
};

export default AddressMapDisplay;
