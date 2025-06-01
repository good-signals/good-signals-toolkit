
import React from 'react';
import { TrendingUp, CheckCircle, Loader2 } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Account } from '@/services/accountService';
import { SignalStatus } from '@/lib/assessmentDisplayUtils';

interface OverallScoreDisplayProps {
  overallSiteSignalScore: number | null;
  completionPercentage: number;
  signalStatus: SignalStatus;
  isLoadingAccounts: boolean;
  accountSettings: Account | null;
  isCalculating?: boolean;
  storedScores?: {
    overallScore: number | null;
    completion: number | null;
  };
}

const OverallScoreDisplay: React.FC<OverallScoreDisplayProps> = ({
  overallSiteSignalScore,
  completionPercentage,
  signalStatus,
  isLoadingAccounts,
  accountSettings,
  isCalculating = false,
  storedScores,
}) => {
  // Use stored scores if we're still calculating and don't have calculated values yet
  const displayScore = isCalculating && overallSiteSignalScore === null && storedScores?.overallScore !== null
    ? storedScores.overallScore
    : overallSiteSignalScore;

  const displayCompletion = isCalculating && completionPercentage === 0 && storedScores?.completion !== null
    ? storedScores.completion
    : completionPercentage;

  const isScoreLoading = isCalculating && overallSiteSignalScore === null;
  const isCompletionLoading = isCalculating && completionPercentage === 0;

  return (
    <>
      <div>
        <h3 className="text-lg font-semibold text-foreground/90 mb-2">Overall Site Signal Score</h3>
        <div className="flex items-center space-x-2">
          {isScoreLoading ? (
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          ) : (
            <TrendingUp className={`h-10 w-10 ${signalStatus.iconColor}`} />
          )}
          <p className={`text-4xl font-bold ${isScoreLoading ? 'text-muted-foreground' : signalStatus.color}`}>
            {isScoreLoading ? (
              'Calculating...'
            ) : typeof displayScore === 'number' ? (
              `${displayScore.toFixed(0)}% - ${signalStatus.text}`
            ) : (
              signalStatus.text
            )}
          </p>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          A measure of overall site suitability based on your targets.
          ({isLoadingAccounts ? 'Loading thresholds...' : 'Using default thresholds.'})
        </p>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground/90 mb-2">Assessment Completion</h3>
        <div className="flex items-center space-x-2">
          {isCompletionLoading ? (
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          ) : (
            <CheckCircle className={`h-10 w-10 ${displayCompletion >= 100 ? 'text-green-500' : 'text-yellow-500'}`} />
          )}
          <p className={`text-4xl font-bold ${isCompletionLoading ? 'text-muted-foreground' : displayCompletion >= 100 ? 'text-green-600' : 'text-yellow-600'}`}>
            {isCompletionLoading ? 'Calculating...' : `${displayCompletion.toFixed(0)}%`}
          </p>
        </div>
        <Progress value={displayCompletion} className="w-full mt-2 h-3" />
        <p className="text-sm text-muted-foreground mt-1">
          Percentage of metrics with entered values.
        </p>
      </div>
    </>
  );
};

export default OverallScoreDisplay;
