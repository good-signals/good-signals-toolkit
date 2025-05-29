
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Clock, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AnalysisModeSelectorProps {
  selectedMode: 'fast' | 'detailed';
  onModeChange: (mode: 'fast' | 'detailed') => void;
  disabled?: boolean;
}

const AnalysisModeSelector: React.FC<AnalysisModeSelectorProps> = ({
  selectedMode,
  onModeChange,
  disabled = false
}) => {
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-medium">Analysis Speed</h3>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                Fast Analysis provides quick results with simplified scoring.
                Detailed Analysis offers comprehensive research-based scoring but takes longer.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={selectedMode === 'fast' ? 'default' : 'outline'}
            onClick={() => onModeChange('fast')}
            disabled={disabled}
            className="h-auto p-3 flex flex-col items-start gap-2"
          >
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="font-medium">Fast Analysis</span>
            </div>
            <div className="text-xs text-left opacity-80">
              ~30-60 seconds<br/>
              Quick scoring with basic criteria
            </div>
          </Button>
          
          <Button
            variant={selectedMode === 'detailed' ? 'default' : 'outline'}
            onClick={() => onModeChange('detailed')}
            disabled={disabled}
            className="h-auto p-3 flex flex-col items-start gap-2"
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Detailed Analysis</span>
            </div>
            <div className="text-xs text-left opacity-80">
              ~60-90 seconds<br/>
              Comprehensive research-based scoring
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalysisModeSelector;
