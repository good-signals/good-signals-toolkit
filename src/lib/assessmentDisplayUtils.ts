
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
    
    // Convert score from percentage (0-100) to decimal (0-1) for comparison with thresholds
    const scoreDecimal = validScore / 100;

    const goodThreshold = accountGoodThreshold ?? DEFAULT_GOOD_THRESHOLD;
    const badThreshold = accountBadThreshold ?? DEFAULT_BAD_THRESHOLD;

    // Ensure thresholds are valid numbers
    const validGoodThreshold = isNaN(goodThreshold) ? DEFAULT_GOOD_THRESHOLD : goodThreshold;
    const validBadThreshold = isNaN(badThreshold) ? DEFAULT_BAD_THRESHOLD : badThreshold;

    if (scoreDecimal >= validGoodThreshold) {
      return { text: 'Good', color: 'text-green-600', iconColor: 'text-green-500' };
    }
    if (scoreDecimal <= validBadThreshold) {
      return { text: 'Bad', color: 'text-red-600', iconColor: 'text-red-500' };
    }
    return { text: 'Neutral', color: 'text-yellow-600', iconColor: 'text-yellow-500' };
  } catch (error) {
    console.error('Error calculating signal status:', error);
    return { text: 'Error', color: 'text-muted-foreground', iconColor: 'text-muted-foreground' };
  }
};
