
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { metricDropdownOptions, specificDropdownMetrics } from '@/config/metricDisplayConfig';
import { calculateMetricSignalScore } from '@/lib/signalScoreUtils';
import { getSignalStatus } from '@/lib/assessmentDisplayUtils';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAccount } from '@/services/userAccountService';
import { getAccountSignalThresholds } from '@/services/signalThresholdsService';

interface MetricDisplayFieldProps {
  metricField: {
    id: string;
    metric_identifier: string;
    label: string;
    category: string;
    entered_value: number | null;
    notes?: string | null;
    target_value?: number;
    higher_is_better?: boolean;
    measurement_type?: string | null;
  };
}

const MetricDisplayField: React.FC<MetricDisplayFieldProps> = ({
  metricField,
}) => {
  const { user } = useAuth();
  const [accountThresholds, setAccountThresholds] = useState<{
    goodThreshold: number;
    badThreshold: number;
  } | null>(null);

  useEffect(() => {
    const loadAccountThresholds = async () => {
      if (!user?.id) return;

      try {
        const userAccount = await getUserAccount(user.id);
        if (!userAccount) return;

        const thresholds = await getAccountSignalThresholds(userAccount.id);
        if (thresholds) {
          setAccountThresholds({
            goodThreshold: thresholds.good_threshold,
            badThreshold: thresholds.bad_threshold,
          });
        } else {
          // Use defaults if no custom thresholds
          setAccountThresholds({
            goodThreshold: 0.75,
            badThreshold: 0.50,
          });
        }
      } catch (error) {
        console.error('Error loading account thresholds:', error);
        // Use defaults on error
        setAccountThresholds({
          goodThreshold: 0.75,
          badThreshold: 0.50,
        });
      }
    };

    loadAccountThresholds();
  }, [user?.id]);

  const getDisplayValue = () => {
    if (metricField.entered_value === null || metricField.entered_value === undefined) {
      return "No value entered";
    }

    // Check if this is a dropdown metric
    if (specificDropdownMetrics.includes(metricField.metric_identifier)) {
      const options = metricDropdownOptions[metricField.metric_identifier];
      const option = options?.find(opt => opt.value === metricField.entered_value);
      return option ? option.label : String(metricField.entered_value);
    }

    return String(metricField.entered_value);
  };

  const getTargetValue = () => {
    if (metricField.target_value === null || metricField.target_value === undefined) {
      return "N/A";
    }
    return String(metricField.target_value);
  };

  const getSignalScore = () => {
    return calculateMetricSignalScore({
      enteredValue: metricField.entered_value,
      targetValue: metricField.target_value,
      higherIsBetter: metricField.higher_is_better ?? true,
    });
  };

  const getSignalScoreBadgeVariant = (score: number | null) => {
    if (score === null || !accountThresholds) return "secondary";
    
    const signalStatus = getSignalStatus(
      score, 
      accountThresholds.goodThreshold, 
      accountThresholds.badThreshold
    );
    
    switch (signalStatus.text) {
      case 'Good':
        return "success";
      case 'Bad':
        return "destructive";
      default:
        return "default";
    }
  };

  const signalScore = getSignalScore();

  return (
    <div className="grid grid-cols-5 gap-4 py-3 border-b border-border last:border-b-0">
      {/* Metric Name */}
      <div className="font-medium text-foreground">
        {metricField.label}
      </div>

      {/* Entered Value */}
      <div className="text-foreground">
        {getDisplayValue()}
      </div>

      {/* Target Value */}
      <div className="text-foreground">
        {getTargetValue()}
      </div>

      {/* Signal Score */}
      <div>
        {signalScore !== null ? (
          <Badge variant={getSignalScoreBadgeVariant(signalScore)} className="text-sm">
            {signalScore}%
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">N/A</span>
        )}
      </div>

      {/* Notes */}
      <div className="text-muted-foreground text-sm">
        {metricField.notes || "-"}
      </div>
    </div>
  );
};

export default MetricDisplayField;
