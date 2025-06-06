
import { getUserAccount } from '@/services/userAccountService';
import { getAccountSignalThresholds } from '@/services/signalThresholdsService';

// Default thresholds to use as fallback
export const DEFAULT_GOOD_THRESHOLD = 0.75;
export const DEFAULT_BAD_THRESHOLD = 0.50;

// Get account signal thresholds from database or return defaults
export const getAccountSignalThresholds = async (accountId: string) => {
  try {
    const thresholds = await getAccountSignalThresholds(accountId);
    
    if (thresholds) {
      return {
        goodThreshold: thresholds.good_threshold,
        badThreshold: thresholds.bad_threshold,
      };
    }
    
    // Return defaults if no custom thresholds are set
    return {
      goodThreshold: DEFAULT_GOOD_THRESHOLD,
      badThreshold: DEFAULT_BAD_THRESHOLD,
    };
  } catch (error) {
    console.error('Error getting account signal thresholds:', error);
    return {
      goodThreshold: DEFAULT_GOOD_THRESHOLD,
      badThreshold: DEFAULT_BAD_THRESHOLD,
    };
  }
};

// Helper for backward compatibility - now uses the new getUserAccount service
export const getAccountForUser = async (userId: string): Promise<string | null> => {
  try {
    const userAccount = await getUserAccount(userId);
    return userAccount?.id || null;
  } catch (error) {
    console.error('Error getting account for user:', error);
    return null;
  }
};
