
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AnalysisModeSelectorProps {
  value: 'manual' | 'ai';
  onChange: (mode: 'manual' | 'ai') => void;
}

const AnalysisModeSelector: React.FC<AnalysisModeSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <Card className="mt-6">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Analysis Mode</h3>
          <div className="flex gap-2">
            <button
              onClick={() => onChange('ai')}
              className={`px-4 py-2 rounded-md transition-colors ${
                value === 'ai'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              AI Analysis
            </button>
            <button
              onClick={() => onChange('manual')}
              className={`px-4 py-2 rounded-md transition-colors ${
                value === 'manual'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Manual Analysis
            </button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {value === 'ai' 
            ? 'AI will analyze and suggest optimal territories based on your prompt'
            : 'Manually specify territories and criteria for analysis'
          }
        </p>
      </CardContent>
    </Card>
  );
};

export default AnalysisModeSelector;
