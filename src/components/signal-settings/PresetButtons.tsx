
import React from 'react';
import { Button } from '@/components/ui/button';

interface PresetButtonsProps {
  onPreset: (preset: 'conservative' | 'balanced' | 'aggressive') => void;
}

export const PresetButtons: React.FC<PresetButtonsProps> = ({ onPreset }) => {
  return (
    <div className="space-y-3">
      <h4 className="font-medium">Quick Presets</h4>
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPreset('conservative')}
        >
          Conservative (40% / 80%)
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPreset('balanced')}
        >
          Balanced (50% / 75%)
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPreset('aggressive')}
        >
          Aggressive (60% / 70%)
        </Button>
      </div>
    </div>
  );
};
