
import React from 'react';
import { TrendingUp, CheckCircle } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Account } from '@/services/accountService';
import { SignalStatus } from '@/lib/assessmentDisplayUtils';

interface OverallScoreDisplayProps {
  overallSiteSignalScore: number | null;
  completionPercentage: number;
  signalStatus: SignalStatus;
  isLoadingAccounts: boolean;
  accountSettings: Account | null;
}

const OverallScoreDisplay: React.FC<OverallScoreDisplayProps> = ({
  overallSiteSignalScore,
  completionPercentage,
  signalStatus,
  isLoadingAccounts,
  accountSettings,
}) => {
  return (
    <>
      <div>
        <h3 className="text-lg font-semibold text-foreground/90 mb-2">Overall Site Signal Score</h3>
        <div className="flex items-center space-x-2">
          <TrendingUp className={`h-10 w-10 ${signalStatus.iconColor}`} />
          <p className={`text-4xl font-bold ${signalStatus.color}`}>
            {typeof overallSiteSignalScore === 'number'
              ? `${overallSiteSignalScore.toFixed(0)}% - ${signalStatus.text}`
              : signalStatus.text}
          </p>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          A measure of overall site suitability based on your targets.
          ({isLoadingAccounts ? 'Loading thresholds...' : accountSettings ? 'Using custom thresholds.' : 'Using default thresholds.'})
        </p>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground/90 mb-2">Assessment Completion</h3>
        <div className="flex items-center space-x-2">
          <CheckCircle className={`h-10 w-10 ${completionPercentage >= 100 ? 'text-green-500' : 'text-yellow-500'}`} />
          <p className={`text-4xl font-bold ${completionPercentage >= 100 ? 'text-green-600' : 'text-yellow-600'}`}>
            {completionPercentage.toFixed(0)}%
          </p>
        </div>
        <Progress value={completionPercentage} className="w-full mt-2 h-3" />
        <p className="text-sm text-muted-foreground mt-1">
          Percentage of metrics with entered values.
        </p>
      </div>
    </>
  );
};

export default OverallScoreDisplay;
