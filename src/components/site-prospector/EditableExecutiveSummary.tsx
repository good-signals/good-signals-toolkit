
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit3, Save, X, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { updateSiteAssessmentSummary } from '@/services/siteAssessmentService';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface EditableExecutiveSummaryProps {
  assessmentId: string;
  executiveSummary: string;
  lastSummaryGeneratedAt?: string | null;
  onRegenerateClick: () => void;
  isRegenerating: boolean;
}

const EditableExecutiveSummary: React.FC<EditableExecutiveSummaryProps> = ({
  assessmentId,
  executiveSummary,
  lastSummaryGeneratedAt,
  onRegenerateClick,
  isRegenerating,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState(executiveSummary);

  const saveEditMutation = useMutation({
    mutationFn: async (newSummary: string) => {
      if (!user) throw new Error("User not authenticated");
      return updateSiteAssessmentSummary(assessmentId, newSummary, user.id);
    },
    onSuccess: () => {
      toast({ title: "Summary Updated", description: "Your changes have been saved successfully." });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['assessmentDetails', assessmentId] });
      queryClient.invalidateQueries({ queryKey: ['siteAssessments', user?.id] });
    },
    onError: (error: Error) => {
      toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    },
  });

  const clearAndRegenerateMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");
      // First clear the existing summary
      await updateSiteAssessmentSummary(assessmentId, '', user.id);
      return true;
    },
    onSuccess: () => {
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['assessmentDetails', assessmentId] });
      queryClient.invalidateQueries({ queryKey: ['siteAssessments', user?.id] });
      // Then trigger the regeneration
      onRegenerateClick();
    },
    onError: (error: Error) => {
      toast({ title: "Clear Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (editedSummary.trim() === '') {
      toast({ title: "Invalid Input", description: "Summary cannot be empty.", variant: "destructive" });
      return;
    }
    saveEditMutation.mutate(editedSummary);
  };

  const handleCancel = () => {
    setEditedSummary(executiveSummary);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setEditedSummary(executiveSummary);
    setIsEditing(true);
  };

  const handleRegenerate = () => {
    clearAndRegenerateMutation.mutate();
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-semibold flex items-center">
              <FileText className="h-6 w-6 mr-2 text-primary" />
              Executive Summary
            </CardTitle>
            {lastSummaryGeneratedAt && (
              <CardDescription>
                Last generated: {format(new Date(lastSummaryGeneratedAt), "PPpp")}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing && (
              <>
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit Summary
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRegenerate} 
                  disabled={isRegenerating || clearAndRegenerateMutation.isPending}
                >
                  {isRegenerating || clearAndRegenerateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  Regenerate Summary
                </Button>
              </>
            )}
            {isEditing && (
              <>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={handleSave}
                  disabled={saveEditMutation.isPending}
                >
                  {saveEditMutation.isPending ? (
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
              className="min-h-[200px] resize-y"
              autoFocus
            />
            <div className="text-sm text-muted-foreground">
              {editedSummary.length} characters
            </div>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">
            {executiveSummary}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EditableExecutiveSummary;
