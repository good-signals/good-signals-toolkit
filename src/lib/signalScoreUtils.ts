
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
      return enteredValue >= 0 ? 100 : 0;
    } else { // lowerIsBetter
      return enteredValue === 0 ? 100 : 0;
    }
  }

  // Handle enteredValue === 0 (when targetValue !== 0)
  if (enteredValue === 0) {
    if (higherIsBetter) {
      // If target is positive, (0 / target) * 100 = 0.
      // If target is negative (e.g. target profit -1000), entered 0 is better.
      // (0 / targetValue) would be 0. This is a simplification.
      // For a more nuanced score with negative targets, logic might need to adapt.
      // Sticking to direct formula (enteredValue / targetValue) * 100 for now.
      return 0;
    } else { // lowerIsBetter
      if (targetValue > 0) return 100; // Entered 0 when target is positive (e.g. 0 defects vs target 10)
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
        rawScore = (enteredValue / targetValue) * 100;
    }
  } else { // lowerIsBetter
    // Ensure enteredValue and targetValue have same sign or handle.
    // If target is positive, and entered is negative, this is very good.
    if (targetValue > 0 && enteredValue < 0) {
        rawScore = 100; // Entered negative when positive target is good for lowerIsBetter
    } 
    // If target is negative, and entered is positive, this is very bad.
    else if (targetValue < 0 && enteredValue > 0) {
        rawScore = 0; 
    }
    else {
        rawScore = (targetValue / enteredValue) * 100;
    }
  }

  const score = Math.max(0, Math.min(rawScore, 100));
  
  return isNaN(score) ? null : Math.round(score);
};

export const calculateOverallSiteSignalScore = (metricScores: (number | null)[]): number | null => {
  const validScores = metricScores.filter(score => typeof score === 'number') as number[];
  if (validScores.length === 0) {
    return null;
  }
  const sum = validScores.reduce((acc, curr) => acc + curr, 0);
  const average = sum / validScores.length;
  return Math.round(average);
};

export const calculateCompletionPercentage = (
  totalMetricsInSet: number,
  metricsWithEnteredValues: number
): number => {
  if (totalMetricsInSet <= 0) {
    return 0; // Or 100 if no metrics means fully complete in a way. Let's say 0 for now.
  }
  const percentage = (metricsWithEnteredValues / totalMetricsInSet) * 100;
  return Math.round(Math.max(0, Math.min(percentage, 100)));
};
