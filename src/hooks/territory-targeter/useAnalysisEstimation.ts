
export const useAnalysisEstimation = () => {
  // Estimate analysis duration based on complexity
  const estimateAnalysisDuration = (prompt: string, marketCount: number, mode: 'fast' | 'detailed') => {
    const baseTime = mode === 'fast' ? 30 : 75;
    const complexityMultiplier = prompt.length > 200 ? 1.3 : 1;
    const marketMultiplier = marketCount > 75 ? 1.2 : 1;
    
    return Math.round(baseTime * complexityMultiplier * marketMultiplier);
  };

  return {
    estimateAnalysisDuration
  };
};
