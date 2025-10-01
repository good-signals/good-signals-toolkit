import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { repairSeattleMetricSetTargetValues } from '@/services/targetMetrics/dataRepairService';
import { useQueryClient } from '@tanstack/react-query';

const DataRepairPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleRepair = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to perform this repair",
        variant: "destructive",
      });
      return;
    }

    setIsRepairing(true);
    setRepairResult(null);

    try {
      const result = await repairSeattleMetricSetTargetValues(
        'f62105e6-7082-4d30-a453-0d3fb4bdf226',
        user.id
      );

      setRepairResult(result);

      if (result.success) {
        // Invalidate all relevant queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: ['targetMetricSets'] });
        queryClient.invalidateQueries({ queryKey: ['siteAssessments'] });
        queryClient.invalidateQueries({ queryKey: ['assessmentDetails'] });

        toast({
          title: "Repair Complete",
          description: result.message,
        });
      } else {
        toast({
          title: "Repair Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Repair error:', error);
      toast({
        title: "Repair Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      setRepairResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate('/target-metric-sets')}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Target Metric Sets
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Data Repair Utility
          </CardTitle>
          <CardDescription>
            Fix misaligned target values in the Seattle - Direct Competitor Proxy metric set
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">What this repair does:</p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li>Corrects target value for Unique Visitors → 1,700,000</li>
              <li>Corrects target value for Visit Frequency → 6.11</li>
              <li>Corrects target value for Dwell Time → 139</li>
              <li>Recalculates all site assessments using this metric set</li>
            </ul>
          </div>

          {repairResult && (
            <div
              className={`p-4 rounded-lg flex items-start gap-3 ${
                repairResult.success
                  ? 'bg-success/10 text-success'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {repairResult.success ? (
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium">
                  {repairResult.success ? 'Repair Successful' : 'Repair Failed'}
                </p>
                <p className="text-sm mt-1">{repairResult.message}</p>
              </div>
            </div>
          )}

          <Button
            onClick={handleRepair}
            disabled={isRepairing}
            className="w-full"
            variant={repairResult?.success ? "outline" : "default"}
          >
            {isRepairing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Repairing Data...
              </>
            ) : repairResult?.success ? (
              'Repair Again'
            ) : (
              'Run Repair'
            )}
          </Button>

          <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted/50 rounded">
            <p className="font-medium mb-1">Note:</p>
            <p>
              This repair is safe to run multiple times. Future saves will automatically maintain
              correct metric ordering to prevent this issue from recurring.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataRepairPage;
