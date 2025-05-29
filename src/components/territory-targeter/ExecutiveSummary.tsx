
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

interface ExecutiveSummaryProps {
  summary: string;
  prompt: string;
  suggestedTitle?: string;
}

const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({ summary, prompt, suggestedTitle }) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {suggestedTitle ? `${suggestedTitle} Analysis` : 'Executive Summary'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Scoring Criteria:</h4>
          <p className="text-sm bg-muted/30 p-3 rounded-md italic">
            "{prompt}"
          </p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">AI Analysis Methodology:</h4>
          <p className="text-sm leading-relaxed">
            {summary}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExecutiveSummary;
