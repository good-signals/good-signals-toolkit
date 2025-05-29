
import { useState, useEffect } from 'react';
import { CBSAData } from '@/types/territoryTargeterTypes';
import { CBSAStatus } from '@/components/territory-targeter/table/CBSAStatusSelector';
import { safeStorage } from '@/utils/safeStorage';
import { sampleCBSAData } from '@/data/sampleCBSAData';

export const useCBSAStatus = () => {
  const [cbsaData, setCbsaData] = useState<CBSAData[]>(sampleCBSAData);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load saved statuses from localStorage on component mount
  useEffect(() => {
    try {
      const savedStatuses = safeStorage.getItem('cbsa-statuses');
      if (savedStatuses) {
        const statusMap = safeStorage.safeParse(savedStatuses, {});
        setCbsaData(prevData =>
          prevData.map(cbsa => ({
            ...cbsa,
            status: statusMap[cbsa.id] || undefined
          }))
        );
      }
    } catch (error) {
      console.error('Failed to load saved CBSA statuses:', error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const handleStatusChange = (cbsaId: string, status: CBSAStatus) => {
    // Update the local state
    setCbsaData(prevData => 
      prevData.map(cbsa => 
        cbsa.id === cbsaId ? { ...cbsa, status } : cbsa
      )
    );

    // Save to localStorage
    try {
      const savedStatuses = safeStorage.getItem('cbsa-statuses');
      let statusMap = {};
      if (savedStatuses) {
        statusMap = safeStorage.safeParse(savedStatuses, {});
      }
      
      statusMap[cbsaId] = status;
      safeStorage.setItem('cbsa-statuses', JSON.stringify(statusMap));
    } catch (error) {
      console.error('Failed to save CBSA status:', error);
    }
  };

  return {
    cbsaData,
    isInitialized,
    handleStatusChange
  };
};
