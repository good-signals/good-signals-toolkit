
import { getUserAccount } from '@/services/userAccountService';

// Simple helper to get default signal thresholds since they were removed from the database
export const getAccountSignalThresholds = (account: any) => {
  return {
    goodThreshold: 0.75, // Default good threshold
    badThreshold: 0.50,  // Default bad threshold
  };
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
