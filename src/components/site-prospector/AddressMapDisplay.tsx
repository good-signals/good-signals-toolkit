
import React, { useEffect, useRef } from 'react';
import mapboxgl, { Marker } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface AddressMapDisplayProps {
  latitude: number;
  longitude: number;
}

// IMPORTANT: Replace this with your actual Mapbox public access token.
// For production, it's best to store this as an environment variable
// or retrieve it from Supabase Edge Function Secrets if you have backend integration.
// e.g., const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
// For now, we'll use a placeholder. You should create a secret in Supabase named MAPBOX_PUBLIC_TOKEN
// and update your code to fetch it if you have backend functions, or set it as an environment variable for client-side only use.
const MAPBOX_ACCESS_TOKEN = 'YOUR_MAPBOX_PUBLIC_ACCESS_TOKEN'; 
// If your app is client-side only and you don't want to expose the token directly in the code,
// consider fetching it from a secure configuration endpoint or have the user input it.
// For this example, replace 'YOUR_MAPBOX_PUBLIC_ACCESS_TOKEN' with your actual token.


const AddressMapDisplay: React.FC<AddressMapDisplayProps> = ({ latitude, longitude }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!MAPBOX_ACCESS_TOKEN || MAPBOX_ACCESS_TOKEN === 'YOUR_MAPBOX_PUBLIC_ACCESS_TOKEN') {
      console.warn(
        "Mapbox Access Token is not configured. Please set it in AddressMapDisplay.tsx " +
        "or via Supabase secrets (MAPBOX_PUBLIC_TOKEN) and ensure it's accessible here."
      );
      // Optionally, display a message to the user in the UI
      if (mapContainerRef.current) {
        mapContainerRef.current.innerHTML = '<p class="p-4 text-center text-red-500">Mapbox Access Token not configured. Map cannot be displayed.</p>';
      }
      return;
    }
    
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    if (mapContainerRef.current) {
      // Initialize map only once
      if (!mapRef.current) {
        mapRef.current = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/streets-v12', // or any other style
          center: [longitude, latitude],
          zoom: 15,
        });

        // Add navigation controls
        mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        
        // Add marker
        markerRef.current = new Marker()
          .setLngLat([longitude, latitude])
          .addTo(mapRef.current);
      } else {
        // If map already exists, just update center and marker position
        mapRef.current.setCenter([longitude, latitude]);
        mapRef.current.setZoom(15);
        if (markerRef.current) {
          markerRef.current.setLngLat([longitude, latitude]);
        } else {
          markerRef.current = new Marker()
            .setLngLat([longitude, latitude])
            .addTo(mapRef.current);
        }
      }
    }

    // Clean up on unmount
    return () => {
      // No need to call mapRef.current?.remove() here if we want to reuse the map instance
      // on subsequent renders with different coordinates. If you want a full re-init, uncomment.
      // if (mapRef.current) {
      //   mapRef.current.remove();
      //   mapRef.current = null;
      // }
    };
  }, [latitude, longitude]);

  return <div ref={mapContainerRef} style={{ width: '100%', height: '300px' }} className="rounded-md" />;
};

export default AddressMapDisplay;
