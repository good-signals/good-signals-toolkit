
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';
import ProgressCounter from './ProgressCounter';
import AnalysisModeSelector from './AnalysisModeSelector';

interface PromptInputProps {
  onSubmit: (prompt: string, mode: 'fast' | 'detailed') => void;
  isLoading: boolean;
  analysisStartTime?: number | null;
  analysisMode?: 'fast' | 'detailed';
  estimatedDuration?: number;
  disabled?: boolean;
  onModeChange?: (mode: 'fast' | 'detailed') => void;
}

const PromptInput: React.FC<PromptInputProps> = ({ 
  onSubmit, 
  isLoading, 
  analysisStartTime,
  analysisMode = 'detailed',
  estimatedDuration = 75,
  disabled = false,
  onModeChange
}) => {
  const [prompt, setPrompt] = useState('');
  const [selectedMode, setSelectedMode] = useState<'fast' | 'detailed'>(analysisMode);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt.trim(), selectedMode);
    }
  };

  const handleModeChange = (mode: 'fast' | 'detailed') => {
    setSelectedMode(mode);
    if (onModeChange) {
      onModeChange(mode);
    }
  };

  const examplePrompts = [
    "Score markets based on Gen Z presence and cultural fit for a youth-oriented sneaker brand",
    "Identify markets with strong healthcare infrastructure and aging populations for senior living facilities",
    "Find markets with tech talent concentration and startup ecosystems for a software company",
    "Assess markets for family dining restaurants based on household income and family density"
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Territory Scoring Criteria
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Analysis Mode Selector */}
        {!isLoading && (
          <AnalysisModeSelector
            selectedMode={selectedMode}
            onModeChange={handleModeChange}
            disabled={disabled}
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="scoring-prompt" className="block text-sm font-medium mb-2">
              How should AI score each market?
            </label>
            <Textarea
              id="scoring-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your scoring criteria here... (e.g., 'Score markets based on Gen Z presence and cultural fit for a youth-oriented sneaker brand')"
              className="min-h-[100px]"
              disabled={disabled || isLoading}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <Button 
              type="submit" 
              disabled={!prompt.trim() || isLoading || disabled}
              className="whitespace-nowrap"
            >
              {isLoading 
                ? `Analyzing Markets (${selectedMode})...` 
                : `Score Markets (${selectedMode === 'fast' ? 'Fast' : 'Detailed'})`
              }
            </Button>
            
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">Example prompts:</p>
              <ul className="space-y-1">
                {examplePrompts.map((example, index) => (
                  <li key={index} className="text-xs">
                    • {example}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </form>

        {/* Progress Counter */}
        <ProgressCounter 
          isActive={isLoading} 
          duration={estimatedDuration}
          startTime={analysisStartTime}
          analysisMode={selectedMode}
        />
      </CardContent>
    </Card>
  );
};

export default PromptInput;
