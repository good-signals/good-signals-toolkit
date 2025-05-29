
export interface MetricScoreInput {
  enteredValue: number | null | undefined;
  targetValue: number | null | undefined;
  higherIsBetter: boolean;
}

export const calculateMetricSignalScore = ({
  enteredValue,
  targetValue,
  higherIsBetter,
}: MetricScoreInput): number | null => {
  if (typeof enteredValue !== 'number' || typeof targetValue !== 'number') {
    return null; // Not enough data or invalid data
  }

  // Handle targetValue === 0
  if (targetValue === 0) {
    if (higherIsBetter) {
      return enteredValue >= 0 ? 1 : 0;
    } else { // lowerIsBetter
      return enteredValue === 0 ? 1 : 0;
    }
  }

  // Handle enteredValue === 0 (when targetValue !== 0)
  if (enteredValue === 0) {
    if (higherIsBetter) {
      return 0;
    } else { // lowerIsBetter
      if (targetValue > 0) return 1; // Entered 0 when target is positive (e.g. 0 defects vs target 10)
      if (targetValue < 0) return 0;   // Entered 0 when target is negative (e.g. 0 profit vs target -10)
    }
  }
  
  // General case: targetValue !== 0 AND enteredValue !== 0
  let rawScore;
  if (higherIsBetter) {
    // Ensure enteredValue and targetValue have same sign for meaningful ratio, or handle negatives.
    // If target is positive, and entered is negative, score should be 0.
    if (targetValue > 0 && enteredValue < 0) {
        rawScore = 0;
    } else {
        rawScore = enteredValue / targetValue;
    }
  } else { // lowerIsBetter
    // Ensure enteredValue and targetValue have same sign or handle.
    // If target is positive, and entered is negative, this is very good.
    if (targetValue > 0 && enteredValue < 0) {
        rawScore = 1; // Entered negative when positive target is good for lowerIsBetter
    } 
    // If target is negative, and entered is positive, this is very bad.
    else if (targetValue < 0 && enteredValue > 0) {
        rawScore = 0; 
    }
    else {
        rawScore = targetValue / enteredValue;
    }
  }

  const score = Math.max(0, Math.min(rawScore, 1));
  
  return isNaN(score) ? null : score;
};

export const calculateOverallSiteSignalScore = (metricScores: (number | null)[]): number | null => {
  const validScores = metricScores.filter(score => typeof score === 'number') as number[];
  if (validScores.length === 0) {
    return null;
  }
  const sum = validScores.reduce((acc, curr) => acc + curr, 0);
  const average = sum / validScores.length;
  return average;
};

export const calculateCompletionPercentage = (
  totalMetricsInSet: number,
  metricsWithEnteredValues: number
): number => {
  if (totalMetricsInSet <= 0) {
    return 0; // Or 1 if no metrics means fully complete in a way. Let's say 0 for now.
  }
  const percentage = metricsWithEnteredValues / totalMetricsInSet;
  return Math.max(0, Math.min(percentage, 1));
};
