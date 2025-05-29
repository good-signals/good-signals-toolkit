
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Target } from 'lucide-react';

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const PromptInput: React.FC<PromptInputProps> = ({ onSubmit, isLoading, disabled = false }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt.trim());
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
      <CardContent>
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
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Markets...
                </>
              ) : (
                'Score Markets'
              )}
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
      </CardContent>
    </Card>
  );
};

export default PromptInput;
