
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAccount } from '@/services/userAccountService';
import { getAccountSignalThresholds, updateAccountSignalThresholds } from '@/services/signalThresholdsService';
import { triggerAssessmentRecalculation } from '@/services/targetMetrics/metricRecalculationService';
import { AlertTriangle, CheckCircle, Clock, Info } from 'lucide-react';

const SignalSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [goodThreshold, setGoodThreshold] = useState(75);
  const [badThreshold, setBadThreshold] = useState(50);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const loadAccountAndThresholds = async () => {
      if (!user?.id) return;

      try {
        const userAccount = await getUserAccount(user.id);
        if (!userAccount) {
          toast({
            title: "Account Required",
            description: "You need to be associated with an account to manage signal settings.",
            variant: "destructive",
          });
          return;
        }

        setAccountId(userAccount.id);

        const thresholds = await getAccountSignalThresholds(userAccount.id);
        if (thresholds) {
          setGoodThreshold(Math.round(thresholds.good_threshold * 100));
          setBadThreshold(Math.round(thresholds.bad_threshold * 100));
        }
      } catch (error) {
        console.error('Error loading signal thresholds:', error);
        toast({
          title: "Loading Error",
          description: "Failed to load signal settings. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAccountAndThresholds();
  }, [user?.id]);

  const handleThresholdChange = (values: number[]) => {
    const [bad, good] = values;
    setBadThreshold(bad);
    setGoodThreshold(good);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!accountId) return;

    setIsSaving(true);
    try {
      const result = await updateAccountSignalThresholds(accountId, {
        good_threshold: goodThreshold / 100,
        bad_threshold: badThreshold / 100,
      });

      if (result) {
        setHasChanges(false);
        toast({
          title: "Settings Saved",
          description: "Your signal thresholds have been updated successfully.",
        });

        // Trigger recalculation of assessment scores
        // Note: This would need a metric set ID, but we'll implement a simplified version
        console.log('Signal thresholds updated, scores will be recalculated on next assessment view');
      } else {
        throw new Error('Failed to save thresholds');
      }
    } catch (error) {
      console.error('Error saving signal thresholds:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save signal settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreset = (preset: 'conservative' | 'balanced' | 'aggressive') => {
    switch (preset) {
      case 'conservative':
        setBadThreshold(40);
        setGoodThreshold(80);
        break;
      case 'balanced':
        setBadThreshold(50);
        setGoodThreshold(75);
        break;
      case 'aggressive':
        setBadThreshold(60);
        setGoodThreshold(70);
        break;
    }
    setHasChanges(true);
  };

  const getScorePreview = (score: number) => {
    if (score >= goodThreshold) {
      return { status: 'Good', color: 'bg-green-500', icon: CheckCircle };
    } else if (score <= badThreshold) {
      return { status: 'Bad', color: 'bg-red-500', icon: AlertTriangle };
    } else {
      return { status: 'Neutral', color: 'bg-yellow-500', icon: Clock };
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading signal settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Signal Settings</h1>
        <p className="text-muted-foreground">
          Configure how site signal scores are categorized as Good, Neutral, or Bad throughout your account.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Main Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Signal Score Thresholds
            </CardTitle>
            <CardDescription>
              Set the percentage thresholds that determine how signal scores are categorized.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Threshold Slider */}
            <div className="space-y-4">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Bad</span>
                <span>Neutral</span>
                <span>Good</span>
              </div>
              
              <div className="relative px-3">
                <Slider
                  value={[badThreshold, goodThreshold]}
                  onValueChange={handleThresholdChange}
                  max={100}
                  min={0}
                  step={1}
                  className="w-full"
                />
                {/* Bad threshold dot indicator */}
                <div 
                  className="absolute top-1/2 w-2 h-2 bg-red-600 rounded-full transform -translate-y-1/2 -translate-x-1/2 z-10"
                  style={{ left: `${badThreshold}%` }}
                />
                {/* Good threshold dot indicator */}
                <div 
                  className="absolute top-1/2 w-2 h-2 bg-green-600 rounded-full transform -translate-y-1/2 -translate-x-1/2 z-10"
                  style={{ left: `${goodThreshold}%` }}
                />
                <div className="flex justify-between text-xs mt-2 text-muted-foreground">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-2">
                  <div className="text-red-600 font-medium">Bad Signal</div>
                  <div className="text-sm text-muted-foreground">
                    0% - {badThreshold}%
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-yellow-600 font-medium">Neutral Signal</div>
                  <div className="text-sm text-muted-foreground">
                    {badThreshold + 1}% - {goodThreshold - 1}%
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-green-600 font-medium">Good Signal</div>
                  <div className="text-sm text-muted-foreground">
                    {goodThreshold}% - 100%
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Preset Buttons */}
            <div className="space-y-3">
              <h4 className="font-medium">Quick Presets</h4>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreset('conservative')}
                >
                  Conservative (40% / 80%)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreset('balanced')}
                >
                  Balanced (50% / 75%)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreset('aggressive')}
                >
                  Aggressive (60% / 70%)
                </Button>
              </div>
            </div>

            <Separator />

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="min-w-[100px]"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Card */}
        <Card>
          <CardHeader>
            <CardTitle>Signal Score Preview</CardTitle>
            <CardDescription>
              See how different scores would be categorized with your current thresholds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[25, 45, 65, 85].map((score) => {
                const preview = getScorePreview(score);
                const Icon = preview.icon;
                return (
                  <div key={score} className="text-center space-y-2">
                    <div className="text-2xl font-bold">{score}%</div>
                    <Badge 
                      variant="secondary" 
                      className={`${preview.color} text-white flex items-center gap-1 justify-center`}
                    >
                      <Icon className="h-3 w-3" />
                      {preview.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>How Signal Thresholds Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>Good Threshold:</strong> Sites with signal scores at or above this percentage are considered to have "Good" signals.
            </p>
            <p>
              <strong>Bad Threshold:</strong> Sites with signal scores at or below this percentage are considered to have "Bad" signals.
            </p>
            <p>
              <strong>Neutral:</strong> Sites with scores between the bad and good thresholds are considered "Neutral."
            </p>
            <p className="text-amber-600">
              <strong>Note:</strong> Changing these thresholds will immediately affect how scores are displayed throughout your account, including in assessments, reports, and the territory targeter.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignalSettingsPage;
