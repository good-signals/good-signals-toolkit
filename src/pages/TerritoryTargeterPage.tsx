
import React, { useState } from 'react';
import TerritoryTargeterPageContent from '@/components/territory-targeter/TerritoryTargeterPageContent';
import { CBSAData } from '@/types/territoryTargeterTypes';
import { useCBSAStatus } from '@/hooks/territory-targeter/useCBSAStatus';

const TerritoryTargeterPage: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [analysisMode, setAnalysisMode] = useState<'manual' | 'ai'>('ai');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use the CBSA status hook which provides the sample data with status management
  const { cbsaData, isInitialized, handleStatusChange } = useCBSAStatus();

  const handleSubmit = () => {
    setIsLoading(true);
    // Add your submission logic here
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  const handleClearAnalysis = () => {
    setError(null);
    setPrompt('');
  };

  // Don't render until CBSA data is initialized
  if (!isInitialized) {
    return <div className="container mx-auto py-8 px-4 text-center">Loading...</div>;
  }

  return (
    <TerritoryTargeterPageContent
      prompt={prompt}
      setPrompt={setPrompt}
      analysisMode={analysisMode}
      setAnalysisMode={setAnalysisMode}
      data={cbsaData}
      setData={() => {}} // Data is managed by the hook, so this is a no-op
      isLoading={isLoading}
      error={error}
      onSubmit={handleSubmit}
      onClearAnalysis={handleClearAnalysis}
      hasData={cbsaData.length > 0}
    />
  );
};

export default TerritoryTargeterPage;
