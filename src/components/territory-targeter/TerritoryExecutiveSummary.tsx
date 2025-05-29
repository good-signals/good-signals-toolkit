
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Sparkles, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CBSAData, TerritoryAnalysis } from '@/types/territoryTargeterTypes';

interface TerritoryExecutiveSummaryProps {
  analysis: TerritoryAnalysis;
  cbsaData: CBSAData[];
  onGenerateSummary: () => Promise<void>;
  isGenerating: boolean;
  executiveSummary?: string;
}

const TerritoryExecutiveSummary: React.FC<TerritoryExecutiveSummaryProps> = ({
  analysis,
  cbsaData,
  onGenerateSummary,
  isGenerating,
  executiveSummary
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Auto-open when summary is generated
  React.useEffect(() => {
    if (executiveSummary && !isOpen) {
      setIsOpen(true);
    }
  }, [executiveSummary, isOpen]);

  return (
    <Card className="mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Executive Summary
                </CardTitle>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
            
            {!executiveSummary && (
              <Button
                onClick={onGenerateSummary}
                disabled={isGenerating}
                className="ml-auto"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate AI Summary
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent>
            {executiveSummary ? (
              <div className="space-y-4">
                <div className="prose prose-sm max-w-none">
                  {executiveSummary.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-3 last:mb-0">
                      {paragraph}
                    </p>
                  ))}
                </div>
                
                <div className="flex justify-end pt-4 border-t">
                  <Button
                    onClick={onGenerateSummary}
                    disabled={isGenerating}
                    variant="outline"
                    size="sm"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Regenerate
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">
                  Generate an AI-powered executive summary of your territory analysis results.
                </p>
                <p className="text-xs mt-2">
                  The summary will highlight top-performing markets and key insights.
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default TerritoryExecutiveSummary;
