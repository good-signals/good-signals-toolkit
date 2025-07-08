
import React from 'react';
import { Target, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const TerritoryHeader: React.FC = () => {
  return (
    <div className="text-center mb-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <Button variant="ghost" asChild>
            <Link to="/toolkit-hub" className="flex items-center gap-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
      </div>
      
      <Target size={48} className="text-primary mx-auto mb-4" />
      <h1 className="text-3xl font-bold text-primary mb-4">Territory Targeter</h1>
      <p className="text-lg text-foreground/80 max-w-2xl mx-auto">
        AI-powered scoring to rank and compare U.S. markets based on your custom criteria.
      </p>
    </div>
  );
};

export default TerritoryHeader;
