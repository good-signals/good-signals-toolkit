
export const getScorePillClasses = (signalStatus: { text: string; color: string; iconColor: string }) => {
  switch (signalStatus.text) {
    case 'Good':
      return 'bg-green-500 text-white';
    case 'Bad':
      return 'bg-red-500 text-white';
    case 'Neutral':
      return 'bg-yellow-500 text-white';
    default:
      return 'bg-gray-400 text-white';
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
