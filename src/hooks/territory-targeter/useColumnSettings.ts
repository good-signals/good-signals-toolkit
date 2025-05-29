
import { useState, useEffect } from 'react';
import { TerritoryAnalysis, ColumnToggleSettings } from '@/types/territoryTargeterTypes';

export const useColumnSettings = (currentAnalysis: TerritoryAnalysis | null) => {
  const [columnSettings, setColumnSettings] = useState<ColumnToggleSettings>({});

  useEffect(() => {
    if (currentAnalysis) {
      const initialSettings: ColumnToggleSettings = {};
      currentAnalysis.criteriaColumns.forEach(column => {
        initialSettings[column.id] = currentAnalysis.includedColumns?.includes(column.id) !== false;
      });
      setColumnSettings(initialSettings);
    }
  }, [currentAnalysis]);

  const toggleColumn = (columnId: string, included: boolean) => {
    setColumnSettings(prev => ({
      ...prev,
      [columnId]: included
    }));
  };

  const deleteColumn = (columnId: string) => {
    setColumnSettings(prev => {
      const newSettings = { ...prev };
      delete newSettings[columnId];
      return newSettings;
    });
  };

  return {
    columnSettings,
    toggleColumn,
    deleteColumn
  };
};
