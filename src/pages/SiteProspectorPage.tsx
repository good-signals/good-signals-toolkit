
import React from 'react';
import { BarChart3 } from 'lucide-react';

const SiteProspectorPage = () => {
  return (
    <div className="text-center py-10">
      <BarChart3 size={48} className="text-primary mx-auto mb-4" />
      <h1 className="text-3xl font-bold text-primary mb-4">Site Prospector</h1> {/* Removed font-serif */}
      <p className="text-lg text-foreground/80">
        This is where the Site Prospector tool will live. Users will be able to evaluate specific sites here.
      </p>
      {/* Placeholder for tool content */}
    </div>
  );
};

export default SiteProspectorPage;
