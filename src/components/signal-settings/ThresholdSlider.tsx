
import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Info } from 'lucide-react';

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
      <div className="flex items-center gap-2 mb-4">
        <Info className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Signal Score Thresholds</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Set the percentage thresholds that determine how signal scores are categorized.
      </p>

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
