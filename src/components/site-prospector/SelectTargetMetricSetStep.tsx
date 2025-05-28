import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { getTargetMetricSets } from '@/services/targetMetricsService';
import { updateSiteAssessment } from '@/services/siteAssessmentService';
import { TargetMetricSet } from '@/types/targetMetrics';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

interface SelectTargetMetricSetStepProps {
  assessmentId: string;
  onMetricSetSelected: (assessmentId: string, metricSetId: string) => void;
  onBack: () => void; // To go back to the address step or cancel
}

const SelectTargetMetricSetStep: React.FC<SelectTargetMetricSetStepProps> = ({
  assessmentId,
  onMetricSetSelected,
  onBack,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMetricSetId, setSelectedMetricSetId] = useState<string | undefined>(undefined);

  const { data: metricSets, isLoading: isLoadingMetricSets, error: metricSetsError } = useQuery<TargetMetricSet[], Error>({
    queryKey: ['targetMetricSets', user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error('User not authenticated');
      return getTargetMetricSets(user.id);
    },
    enabled: !!user?.id,
  });

  const updateAssessmentMutation = useMutation({
    mutationFn: (targetMetricSetId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      return updateSiteAssessment(assessmentId, { target_metric_set_id: targetMetricSetId }, user.id);
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: "Target metric set has been selected successfully." });
      onMetricSetSelected(assessmentId, data.target_metric_set_id!);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `Failed to update assessment: ${error.message}`, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!selectedMetricSetId) {
      toast({ title: "Validation Error", description: "Please select a target metric set.", variant: "destructive" });
      return;
    }
    updateAssessmentMutation.mutate(selectedMetricSetId);
  };

  if (isLoadingMetricSets) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading metric sets...</p>
      </div>
    );
  }

  if (metricSetsError) {
    return <p className="text-destructive">Error loading metric sets: {metricSetsError.message}</p>;
  }
  
  if (!metricSets || metricSets.length === 0) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Step 2: Select Target Metric Set</CardTitle>
        </CardHeader>
        <CardContent>
          <p>You don't have any saved target metric sets yet.</p>
          <p className="mt-2">Please go to the "Target Metrics Builder" to create a metric set first.</p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          {/* Optionally, link to create metric set page */}
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Step 2: Select Target Metric Set</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="target_metric_set">Select Target Metric Set</Label>
          <Select onValueChange={setSelectedMetricSetId} value={selectedMetricSetId}>
            <SelectTrigger id="target_metric_set">
              <SelectValue placeholder="Choose a metric set..." />
            </SelectTrigger>
            <SelectContent>
              {metricSets.map((set) => (
                <SelectItem key={set.id} value={set.id}>
                  {set.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!selectedMetricSetId && updateAssessmentMutation.isError && <p className="text-sm text-destructive mt-1">Please select a metric set.</p>}
        </div>
        <p className="text-sm text-muted-foreground pt-4">
          The selected metric set will define the criteria for this site assessment.
          Step 3 (Input fields) will appear after this step.
        </p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack} disabled={updateAssessmentMutation.isPending}>
          Back
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={updateAssessmentMutation.isPending || !selectedMetricSetId}>
          {updateAssessmentMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Next: Input Metrics
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SelectTargetMetricSetStep;
