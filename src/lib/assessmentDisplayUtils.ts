
export interface SignalStatus {
  text: string;
  color: string; // Tailwind text color class e.g. 'text-green-600'
  iconColor: string; // Tailwind text color class for icon
}

export const DEFAULT_GOOD_THRESHOLD = 0.75; // 75%
export const DEFAULT_BAD_THRESHOLD = 0.50;  // 50%

export const getSignalStatus = (
  score: number | null,
  accountGoodThreshold?: number | null,
  accountBadThreshold?: number | null
): SignalStatus => {
  try {
    if (score === null || score === undefined || isNaN(score)) {
      return { text: 'N/A', color: 'text-muted-foreground', iconColor: 'text-muted-foreground' };
    }

    // Ensure score is a valid number between 0 and 100
    const validScore = Math.max(0, Math.min(100, Number(score)));
    
    // Use provided thresholds or fall back to defaults (convert to percentage if decimal)
    const goodThreshold = typeof accountGoodThreshold === 'number' ? 
      (accountGoodThreshold <= 1 ? accountGoodThreshold * 100 : accountGoodThreshold) : 
      DEFAULT_GOOD_THRESHOLD * 100;
    const badThreshold = typeof accountBadThreshold === 'number' ? 
      (accountBadThreshold <= 1 ? accountBadThreshold * 100 : accountBadThreshold) : 
      DEFAULT_BAD_THRESHOLD * 100;

    // Ensure thresholds are valid numbers
    const validGoodThreshold = isNaN(goodThreshold) ? DEFAULT_GOOD_THRESHOLD * 100 : goodThreshold;
    const validBadThreshold = isNaN(badThreshold) ? DEFAULT_BAD_THRESHOLD * 100 : badThreshold;

    if (validScore >= validGoodThreshold) {
      return { text: 'Good', color: 'text-green-600', iconColor: 'text-green-500' };
    }
    if (validScore <= validBadThreshold) {
      return { text: 'Bad', color: 'text-red-600', iconColor: 'text-red-500' };
    }
    return { text: 'Neutral', color: 'text-yellow-600', iconColor: 'text-yellow-500' };
  } catch (error) {
    console.error('Error calculating signal status:', error);
    return { text: 'Error', color: 'text-muted-foreground', iconColor: 'text-muted-foreground' };
  }
};
