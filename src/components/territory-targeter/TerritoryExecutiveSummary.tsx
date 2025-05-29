
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Sparkles, ChevronDown, ChevronUp, Loader2, Edit3, Save, X } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CBSAData, TerritoryAnalysis } from '@/types/territoryTargeterTypes';
import { toast } from '@/hooks/use-toast';

interface TerritoryExecutiveSummaryProps {
  analysis: TerritoryAnalysis;
  cbsaData: CBSAData[];
  onGenerateSummary: () => Promise<void>;
  isGenerating: boolean;
  executiveSummary?: string;
  onUpdateSummary?: (newSummary: string) => void;
}

const TerritoryExecutiveSummary: React.FC<TerritoryExecutiveSummaryProps> = ({
  analysis,
  cbsaData,
  onGenerateSummary,
  isGenerating,
  executiveSummary,
  onUpdateSummary
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState(executiveSummary || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = () => {
    setEditedSummary(executiveSummary || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (editedSummary.trim() === '') {
      toast({
        title: "Invalid Input",
        description: "Summary cannot be empty.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      // Update the executive summary
      if (onUpdateSummary) {
        onUpdateSummary(editedSummary);
      }
      
      setIsEditing(false);
      toast({
        title: "Summary Updated",
        description: "Your changes have been saved successfully."
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save the summary. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedSummary(executiveSummary || '');
    setIsEditing(false);
  };

  return (
    <Card className="mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer">
                <CardTitle className="flex items-center gap-2 text-lg">
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
            
            <div className="flex items-center gap-2">
              {!isEditing && executiveSummary && (
                <Button
                  onClick={handleEdit}
                  variant="outline"
                  size="sm"
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
              
              {isEditing && (
                <>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </>
              )}
              
              {!executiveSummary && !isEditing && (
                <Button
                  onClick={onGenerateSummary}
                  disabled={isGenerating}
                  size="sm"
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
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {isEditing ? (
              <div className="space-y-4">
                <ScrollArea className="h-48 w-full rounded-md border">
                  <div className="p-3">
                    <Textarea
                      value={editedSummary}
                      onChange={(e) => setEditedSummary(e.target.value)}
                      placeholder="Enter your executive summary..."
                      className="min-h-[150px] resize-none border-0 focus-visible:ring-0"
                      autoFocus
                    />
                  </div>
                </ScrollArea>
                <div className="text-sm text-muted-foreground">
                  {editedSummary.length} characters
                </div>
              </div>
            ) : executiveSummary ? (
              <div className="space-y-4">
                <ScrollArea className="h-48 w-full rounded-md border">
                  <div className="p-4">
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                      {executiveSummary}
                    </div>
                  </div>
                </ScrollArea>
                
                <div className="flex justify-end pt-2 border-t">
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
