
import React from 'react';
import { MapPin } from 'lucide-react';

const SiteTreasureMapPage = () => {
  return (
    <div className="text-center py-10">
      <MapPin size={48} className="text-primary mx-auto mb-4" />
      <h1 className="text-3xl font-bold text-primary mb-4">Site Treasure Map</h1> {/* Removed font-serif */}
      <p className="text-lg text-foreground/80">
        The treasure map viewer will be embedded here.
      </p>
      {/* Placeholder for map embedding */}
    </div>
  );
};

export default SiteTreasureMapPage;
