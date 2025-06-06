
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAccount } from '@/services/userAccountService';
import { getAccountSignalThresholds, updateAccountSignalThresholds } from '@/services/signalThresholdsService';
import { ThresholdSlider } from '@/components/signal-settings/ThresholdSlider';
import { PresetButtons } from '@/components/signal-settings/PresetButtons';
import { SignalPreview } from '@/components/signal-settings/SignalPreview';
import { InfoCard } from '@/components/signal-settings/InfoCard';

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
        setBadThreshold(60);
        setGoodThreshold(80);
        break;
      case 'balanced':
        setBadThreshold(50);
        setGoodThreshold(75);
        break;
      case 'aggressive':
        setBadThreshold(40);
        setGoodThreshold(70);
        break;
    }
    setHasChanges(true);
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
            <CardTitle>Signal Score Thresholds</CardTitle>
            <CardDescription>
              Set the percentage thresholds that determine how signal scores are categorized.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ThresholdSlider
              goodThreshold={goodThreshold}
              badThreshold={badThreshold}
              onThresholdChange={handleThresholdChange}
            />

            <Separator />

            <PresetButtons onPreset={handlePreset} />

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

        <SignalPreview
          goodThreshold={goodThreshold}
          badThreshold={badThreshold}
        />

        <InfoCard />
      </div>
    </div>
  );
};

export default SignalSettingsPage;
