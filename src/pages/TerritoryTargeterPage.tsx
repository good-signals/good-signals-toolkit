
import React from 'react';
import { Search } from 'lucide-react';

const TerritoryTargeterPage = () => {
  return (
    <div className="text-center py-10">
      <Search size={48} className="text-primary mx-auto mb-4" />
      <h1 className="text-3xl font-bold font-serif text-primary mb-4">Territory Targeter</h1>
      <p className="text-lg text-foreground/80">
        This is where the Territory Targeter tool will live. Users can rank and compare markets.
      </p>
      {/* Placeholder for tool content */}
    </div>
  );
};

export default TerritoryTargeterPage;
