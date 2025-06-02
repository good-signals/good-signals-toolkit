
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Edit3, Save, X } from 'lucide-react';

interface FinalExecutiveSummaryProps {
  executiveSummary: string | null;
  isGeneratingSummary: boolean;
  hasAnalysisData: boolean;
  onGenerateExecutiveSummary: (cbsaData: any[]) => void;
  onUpdateExecutiveSummary: (summary: string) => void;
  cbsaData: any[];
}

const FinalExecutiveSummary: React.FC<FinalExecutiveSummaryProps> = ({
  executiveSummary,
  isGeneratingSummary,
  hasAnalysisData,
  onGenerateExecutiveSummary,
  onUpdateExecutiveSummary,
  cbsaData
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState(executiveSummary || '');

  if (!hasAnalysisData) return null;

  const handleEdit = () => {
    setEditedSummary(executiveSummary || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    onUpdateExecutiveSummary(editedSummary);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedSummary(executiveSummary || '');
    setIsEditing(false);
  };

  const handleClearAndRegenerate = () => {
    onUpdateExecutiveSummary('');
    setIsEditing(false);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generative Executive Summary
          </CardTitle>
          <div className="flex items-center gap-2">
            {!executiveSummary && !isEditing && (
              <Button
                onClick={() => onGenerateExecutiveSummary(cbsaData)}
                disabled={isGeneratingSummary}
              >
                {isGeneratingSummary ? 'Generating...' : 'Generate AI Summary'}
              </Button>
            )}
            {executiveSummary && !isEditing && (
              <>
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onGenerateExecutiveSummary(cbsaData)}
                  disabled={isGeneratingSummary}
                >
                  {isGeneratingSummary ? 'Regenerating...' : 'Regenerate'}
                </Button>
              </>
            )}
            {isEditing && (
              <>
                <Button variant="default" size="sm" onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <Textarea
              value={editedSummary}
              onChange={(e) => setEditedSummary(e.target.value)}
              placeholder="Enter your executive summary..."
              className="min-h-[300px] max-h-[500px] resize-y"
              autoFocus
            />
            <div className="text-sm text-muted-foreground">
              {editedSummary.length} characters
            </div>
          </div>
        ) : executiveSummary ? (
          <div className="max-h-[400px] overflow-y-auto">
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {executiveSummary}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={handleClearAndRegenerate}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Clear and regenerate
              </button>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Generate an AI-powered executive summary of your territory analysis results.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default FinalExecutiveSummary;
