
import React from 'react';
import { Search, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const TerritoryHeader: React.FC = () => {
  return (
    <div className="text-center mb-8">
      <div className="flex items-center justify-between mb-4">
        <Button asChild variant="ghost" className="text-foreground hover:bg-muted">
          <Link to="/toolkit-hub" className="flex items-center gap-2">
            <ArrowLeft size={20} />
            Back to Toolkit Hub
          </Link>
        </Button>
        <div className="flex-1" />
      </div>
      
      <Search size={48} className="text-primary mx-auto mb-4" />
      <h1 className="text-3xl font-bold text-primary mb-4">Territory Targeter</h1>
      <p className="text-lg text-foreground/80 max-w-2xl mx-auto">
        AI-powered scoring to rank and compare U.S. markets based on your custom criteria.
      </p>
    </div>
  );
};

export default TerritoryHeader;
