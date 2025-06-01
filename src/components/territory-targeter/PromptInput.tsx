
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Trash2 } from 'lucide-react';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  hasData: boolean;
  onClearAnalysis: () => void;
}

const PromptInput: React.FC<PromptInputProps> = ({
  value,
  onChange,
  onSubmit,
  isLoading,
  hasData,
  onClearAnalysis,
}) => {
  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
      <div className="space-y-4">
        <Textarea
          placeholder="Describe the type of location or market you want to analyze..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[100px] resize-none"
        />
        <div className="flex gap-3">
          <Button 
            onClick={onSubmit} 
            disabled={isLoading || !value.trim()}
            className="flex-1"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            {isLoading ? 'Analyzing...' : 'Analyze Territory'}
          </Button>
          {hasData && (
            <Button 
              onClick={onClearAnalysis}
              variant="outline"
              disabled={isLoading}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Analysis
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromptInput;
