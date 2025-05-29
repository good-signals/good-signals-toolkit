
import { useState } from 'react';
import { ManualScoreOverride } from '@/types/territoryTargeterTypes';

export const useManualScoreOverrides = () => {
  const [manualScoreOverrides, setManualScoreOverrides] = useState<ManualScoreOverride[]>([]);

  const addManualOverride = (override: ManualScoreOverride) => {
    setManualScoreOverrides(prev => {
      const existing = prev.find(
        o => o.marketName === override.marketName && o.columnId === override.columnId
      );
      if (existing) {
        return prev.map(o => 
          o.marketName === override.marketName && o.columnId === override.columnId
            ? override
            : o
        );
      }
      return [...prev, override];
    });
  };

  const removeManualOverride = (marketName: string, columnId: string) => {
    setManualScoreOverrides(prev => 
      prev.filter(o => !(o.marketName === marketName && o.columnId === columnId))
    );
  };

  return {
    manualScoreOverrides,
    addManualOverride,
    removeManualOverride
  };
};
