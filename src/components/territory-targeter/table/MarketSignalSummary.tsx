
import React from 'react';
import { getSignalStatus } from '@/lib/assessmentDisplayUtils';
import { getScorePillClasses } from '@/lib/cbsaTableUtils';

interface MarketSignalSummaryProps {
  marketSignalScore: number;
  accountGoodThreshold?: number | null;
  accountBadThreshold?: number | null;
}

const MarketSignalSummary: React.FC<MarketSignalSummaryProps> = ({
  marketSignalScore,
  accountGoodThreshold,
  accountBadThreshold
}) => {
  const marketSignalStatus = getSignalStatus(marketSignalScore, accountGoodThreshold, accountBadThreshold);

  return (
    <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
      <span className="text-sm font-medium">Market Signal Score:</span>
      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold ${getScorePillClasses(marketSignalStatus)}`}>
        {marketSignalScore}%
      </span>
      <span className="text-sm text-muted-foreground">
        (Average of all market scores)
      </span>
    </div>
  );
};

export default MarketSignalSummary;
