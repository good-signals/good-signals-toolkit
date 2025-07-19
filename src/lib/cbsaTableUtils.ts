

export const getScorePillClasses = (signalStatus: { text: string; color: string; iconColor: string }) => {
  // Add debug logging to see what signal status is being passed
  console.log('getScorePillClasses called with:', signalStatus);
  
  switch (signalStatus.text) {
    case 'Good':
      return 'bg-green-600 text-white hover:bg-green-700';
    case 'Bad':
      return 'bg-red-600 text-white hover:bg-red-700';
    case 'Neutral':
      return 'bg-yellow-600 text-white hover:bg-yellow-700';
    default:
      console.log('Unknown signal status, using default styling:', signalStatus.text);
      return 'bg-muted text-muted-foreground hover:bg-muted/80';
  }
};

export const formatPopulationGrowth = (growth: number) => {
  const percentage = (growth * 100).toFixed(2);
  return growth >= 0 ? `+${percentage}%` : `${percentage}%`;
};

export const getGrowthColor = (growth: number) => {
  if (growth > 0.03) return 'text-green-600'; // Above 3% growth
  if (growth > 0) return 'text-green-500'; // Positive growth
  if (growth > -0.01) return 'text-yellow-600'; // Slight decline
  return 'text-red-500'; // Significant decline
};

