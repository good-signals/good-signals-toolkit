
import React from 'react';
import { Slider } from '@/components/ui/slider';

interface ThresholdSliderProps {
  goodThreshold: number;
  badThreshold: number;
  onThresholdChange: (values: number[]) => void;
}

export const ThresholdSlider: React.FC<ThresholdSliderProps> = ({
  goodThreshold,
  badThreshold,
  onThresholdChange,
}) => {
  return (
    <div className="space-y-6">
      {/* Threshold Slider */}
      <div className="space-y-4">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Bad</span>
          <span>Neutral</span>
          <span>Good</span>
        </div>
        
        <div className="relative px-3">
          <Slider
            value={[badThreshold, goodThreshold]}
            onValueChange={onThresholdChange}
            max={100}
            min={0}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs mt-2 text-muted-foreground">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <div className="text-red-600 font-medium">Bad Signal</div>
            <div className="text-sm text-muted-foreground">
              0% - {badThreshold}%
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-yellow-600 font-medium">Neutral Signal</div>
            <div className="text-sm text-muted-foreground">
              {badThreshold + 1}% - {goodThreshold - 1}%
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-green-600 font-medium">Good Signal</div>
            <div className="text-sm text-muted-foreground">
              {goodThreshold}% - 100%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
