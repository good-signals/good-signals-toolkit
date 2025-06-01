
import { Account } from '@/services/accountService';

// Simple helper to get default signal thresholds since they were removed from the database
export const getAccountSignalThresholds = (account: Account | null) => {
  return {
    goodThreshold: 0.75, // Default good threshold
    badThreshold: 0.50,  // Default bad threshold
  };
};

// Helper for backward compatibility
export const getAccountForUser = async (userId: string): Promise<Account | null> => {
  // This is a simplified version that just returns null
  // In the future, this could be enhanced to return the user's account
  return null;
};
