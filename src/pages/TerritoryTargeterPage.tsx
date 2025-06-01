
import React, { useState } from 'react';
import TerritoryTargeterPageContent from '@/components/territory-targeter/TerritoryTargeterPageContent';
import { CBSAData } from '@/types/territoryTargeterTypes';

const TerritoryTargeterPage: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [analysisMode, setAnalysisMode] = useState<'manual' | 'ai'>('ai');
  const [data, setData] = useState<CBSAData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setIsLoading(true);
    // Add your submission logic here
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  const handleClearAnalysis = () => {
    setData([]);
    setError(null);
    setPrompt('');
  };

  return (
    <TerritoryTargeterPageContent
      prompt={prompt}
      setPrompt={setPrompt}
      analysisMode={analysisMode}
      setAnalysisMode={setAnalysisMode}
      data={data}
      setData={setData}
      isLoading={isLoading}
      error={error}
      onSubmit={handleSubmit}
      onClearAnalysis={handleClearAnalysis}
      hasData={data.length > 0}
    />
  );
};

export default TerritoryTargeterPage;
