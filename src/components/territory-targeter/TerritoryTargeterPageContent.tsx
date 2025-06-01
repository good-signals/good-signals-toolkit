
import React from 'react';
import { Search } from 'lucide-react';
import TerritoryHeader from './TerritoryHeader';
import PromptInput from './PromptInput';
import AnalysisModeSelector from './AnalysisModeSelector';
import TerritoryResultsSection from './TerritoryResultsSection';
import TerritoryExecutiveSummary from './TerritoryExecutiveSummary';
import TerritoryNotices from './TerritoryNotices';
import { CBSAData } from '@/types/territoryTargeterTypes';
import { useAuth } from '@/contexts/AuthContext';

interface TerritoryTargeterPageContentProps {
  prompt: string;
  setPrompt: (value: string) => void;
  analysisMode: 'manual' | 'ai';
  setAnalysisMode: (mode: 'manual' | 'ai') => void;
  data: CBSAData[];
  setData: (data: CBSAData[]) => void;
  isLoading: boolean;
  error: string | null;
  onSubmit: () => void;
  onClearAnalysis: () => void;
  hasData: boolean;
}

const TerritoryTargeterPageContent: React.FC<TerritoryTargeterPageContentProps> = ({
  prompt,
  setPrompt,
  analysisMode,
  setAnalysisMode,
  data,
  setData,
  isLoading,
  error,
  onSubmit,
  onClearAnalysis,
  hasData,
}) => {
  const { user } = useAuth();

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <TerritoryHeader />
      
      <PromptInput
        value={prompt}
        onChange={setPrompt}
        onSubmit={onSubmit}
        isLoading={isLoading}
        hasData={hasData}
        onClearAnalysis={onClearAnalysis}
      />

      <AnalysisModeSelector
        value={analysisMode}
        onChange={setAnalysisMode}
      />

      <TerritoryNotices user={user} cbsaDataLength={data.length} />

      <TerritoryResultsSection
        cbsaData={data}
        setCbsaData={setData}
        isLoading={isLoading}
        error={error}
        analysisMode={analysisMode}
      />

      <TerritoryExecutiveSummary cbsaData={data} />
    </div>
  );
};

export default TerritoryTargeterPageContent;
