
import React from 'react';
import { Search } from 'lucide-react';

const TerritoryHeader: React.FC = () => {
  return (
    <div className="text-center mb-8">
      <Search size={48} className="text-primary mx-auto mb-4" />
      <h1 className="text-3xl font-bold text-primary mb-4">Territory Targeter</h1>
      <p className="text-lg text-foreground/80 max-w-2xl mx-auto">
        AI-powered scoring to rank and compare U.S. markets based on your custom criteria.
      </p>
    </div>
  );
};

export default TerritoryHeader;
