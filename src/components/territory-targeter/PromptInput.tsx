import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Loader2, Trash2 } from 'lucide-react';
interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  hasData: boolean;
  onClearAnalysis: () => void;
  analysisMode: 'manual' | 'ai';
  onAnalysisModeChange: (mode: 'manual' | 'ai') => void;
  scoringMode: 'fast' | 'detailed';
  onScoringModeChange: (mode: 'fast' | 'detailed') => void;
}
const PromptInput: React.FC<PromptInputProps> = ({
  value,
  onChange,
  onSubmit,
  isLoading,
  hasData,
  onClearAnalysis,
  analysisMode,
  onAnalysisModeChange,
  scoringMode,
  onScoringModeChange
}) => {
  return <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Add Analysis Prompt</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Prompt Input */}
        <div className="space-y-4">
          <Textarea placeholder="Describe the type of location or market you want to analyze..." value={value} onChange={e => onChange(e.target.value)} className="min-h-[100px] resize-none" />
          <div className="flex gap-3">
            <Button onClick={onSubmit} disabled={isLoading || !value.trim()} className="flex-1">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              {isLoading ? 'Analyzing...' : 'Analyze Territory'}
            </Button>
            {hasData && <Button onClick={onClearAnalysis} variant="outline" disabled={isLoading}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Analysis
              </Button>}
          </div>
        </div>

        {/* Analysis Mode */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Analysis Mode</h4>
            <div className="flex gap-2">
              <button onClick={() => onAnalysisModeChange('ai')} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${analysisMode === 'ai' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                AI Analysis
              </button>
              <button onClick={() => onAnalysisModeChange('manual')} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${analysisMode === 'manual' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                Manual Analysis
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {analysisMode === 'ai' ? 'AI will analyze and suggest optimal territories based on your prompt' : 'Manually specify territories and criteria for analysis'}
          </p>
        </div>

        {/* Analysis Depth */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Analysis Depth</h4>
            <div className="flex gap-2">
              <button onClick={() => onScoringModeChange('fast')} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${scoringMode === 'fast' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                Fast Analysis
              </button>
              <button onClick={() => onScoringModeChange('detailed')} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${scoringMode === 'detailed' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                Detailed Analysis
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {scoringMode === 'fast' ? 'Fast analysis provides quick results with basic scoring (~2-3 minutes)' : 'Detailed analysis provides comprehensive scoring with deeper insights (~5-8 minutes)'}
          </p>
        </div>
      </CardContent>
    </Card>;
};
export default PromptInput;