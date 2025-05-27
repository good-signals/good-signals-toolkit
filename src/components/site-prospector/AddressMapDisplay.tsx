
import React, { useEffect, useRef } from 'react';

interface AddressMapDisplayProps {
  latitude: number;
  longitude: number;
}

const AddressMapDisplay: React.FC<AddressMapDisplayProps> = ({ latitude, longitude }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || typeof window === 'undefined' || !window.google || !window.google.maps) {
      console.warn("Google Maps API not loaded yet.");
      if (mapContainerRef.current) {
        mapContainerRef.current.innerHTML = '<p class="p-4 text-center text-red-500">Google Maps API not available. Map cannot be displayed.</p>';
      }
      return;
    }

    const mapCenter = { lat: latitude, lng: longitude };

    if (!mapRef.current) {
      // Initialize map
      mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
        center: mapCenter,
        zoom: 15,
        mapTypeControl: false, // Optional: disable map type control
        streetViewControl: false, // Optional: disable street view
      });

      // Add marker
      markerRef.current = new window.google.maps.Marker({
        position: mapCenter,
        map: mapRef.current,
        title: 'Selected Location',
      });
    } else {
      // If map already exists, update center and marker position
      mapRef.current.setCenter(mapCenter);
      mapRef.current.setZoom(15); // Reset zoom or keep current
      if (markerRef.current) {
        markerRef.current.setPosition(mapCenter);
      } else {
        markerRef.current = new window.google.maps.Marker({
          position: mapCenter,
          map: mapRef.current,
          title: 'Selected Location',
        });
      }
    }

    // No explicit cleanup needed for Google Maps in this simple case,
    // as the map instance is tied to the lifecycle of the div.
    // If complex event listeners were added, they should be removed here.

  }, [latitude, longitude]);

  return <div ref={mapContainerRef} style={{ width: '100%', height: '300px' }} className="rounded-md border" />;
};

export default AddressMapDisplay;
