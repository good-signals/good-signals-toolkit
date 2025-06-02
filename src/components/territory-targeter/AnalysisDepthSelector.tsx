
import React from 'react';

interface AnalysisDepthSelectorProps {
  scoringMode: 'fast' | 'detailed';
  setScoringMode: (mode: 'fast' | 'detailed') => void;
}

const AnalysisDepthSelector: React.FC<AnalysisDepthSelectorProps> = ({
  scoringMode,
  setScoringMode
}) => {
  return (
    <div className="mt-6 bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Analysis Depth</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setScoringMode('fast')}
            className={`px-4 py-2 rounded-md transition-colors ${
              scoringMode === 'fast'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Fast Analysis
          </button>
          <button
            onClick={() => setScoringMode('detailed')}
            className={`px-4 py-2 rounded-md transition-colors ${
              scoringMode === 'detailed'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Detailed Analysis
          </button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {scoringMode === 'fast' 
          ? 'Fast analysis provides quick results with basic scoring (~2-3 minutes)'
          : 'Detailed analysis provides comprehensive scoring with deeper insights (~5-8 minutes)'
        }
      </p>
    </div>
  );
};

export default AnalysisDepthSelector;
