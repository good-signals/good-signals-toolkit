
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Account, fetchUserAccountsWithAdminRole, updateAccountDetailsService } from '@/services/accountService';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from '@/components/ui/skeleton';

const SignalSettingsPage = () => {
  const { user, authLoading } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state for thresholds
  const [goodThreshold, setGoodThreshold] = useState<number>(0.75);
  const [badThreshold, setBadThreshold] = useState<number>(0.50);

  const [initialGoodThreshold, setInitialGoodThreshold] = useState<number>(0.75);
  const [initialBadThreshold, setInitialBadThreshold] = useState<number>(0.50);

  const fetchAccountData = useCallback(async () => {
    if (user && !authLoading) {
      setIsLoadingAccount(true);
      try {
        const accounts = await fetchUserAccountsWithAdminRole(user.id);
        if (accounts && accounts.length > 0) {
          const currentAccount = accounts[0];
          setAccount(currentAccount);
          setGoodThreshold(currentAccount.signal_good_threshold);
          setBadThreshold(currentAccount.signal_bad_threshold);
          setInitialGoodThreshold(currentAccount.signal_good_threshold);
          setInitialBadThreshold(currentAccount.signal_bad_threshold);
        } else {
          setAccount(null);
          toast.error("No administrative account found to manage signal settings.");
        }
      } catch (error) {
        console.error("Error fetching account for signal settings:", error);
        toast.error("Failed to load account details for signal settings.");
      } finally {
        setIsLoadingAccount(false);
      }
    } else if (!authLoading) {
      setIsLoadingAccount(false);
      setAccount(null);
    }
  }, [user, authLoading]);

  useEffect(() => {
    fetchAccountData();
  }, [fetchAccountData]);

  const handleGoodThresholdChange = (value: number[]) => {
    const newGood = value[0];
    setGoodThreshold(newGood);
    if (newGood < badThreshold) {
      setBadThreshold(newGood); // Ensure bad threshold is not higher than good
    }
  };

  const handleBadThresholdChange = (value: number[]) => {
    const newBad = value[0];
    setBadThreshold(newBad);
    if (newBad > goodThreshold) {
      setGoodThreshold(newBad); // Ensure good threshold is not lower than bad
    }
  };

  const handleSaveThresholds = async () => {
    if (!account) {
      toast.error("No account selected to save settings for.");
      return;
    }
    if (badThreshold > goodThreshold) {
      toast.error("Bad signal threshold cannot be higher than Good signal threshold.");
      return;
    }

    setIsSaving(true);
    try {
      const updatedAccount = await updateAccountDetailsService(account.id, {
        signal_good_threshold: goodThreshold,
        signal_bad_threshold: badThreshold,
      });
      if (updatedAccount) {
        setAccount(updatedAccount);
        setInitialGoodThreshold(updatedAccount.signal_good_threshold);
        setInitialBadThreshold(updatedAccount.signal_bad_threshold);
        // toast.success("Signal settings saved successfully!"); // Already handled by service
      } else {
        // toast.error("Failed to save signal settings."); // Already handled by service
      }
    } catch (error) {
      console.error("Error saving signal settings:", error);
      toast.error("An unexpected error occurred while saving signal settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatPercentage = (value: number) => `${Math.round(value * 100)}%`;

  const hasChanges = goodThreshold !== initialGoodThreshold || badThreshold !== initialBadThreshold;

  if (authLoading || isLoadingAccount) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4 mt-2" />
          </CardHeader>
          <CardContent className="space-y-8">
            {[1, 2].map(i => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-24" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!account) {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Signal Settings</h1>
        <p className="text-muted-foreground mt-2">
          Could not load account information. Please ensure you are logged in and have an administrative role on an account.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Signal Settings</h1>
        <p className="text-muted-foreground mt-2">
          Define the thresholds for categorizing signals as Good, Neutral, or Bad for your account ({account.name}).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configure Signal Thresholds</CardTitle>
          <CardDescription>
            Adjust the sliders to set the percentage scores that determine signal categories.
            Good signals are scores greater than or equal to the Good Threshold.
            Bad signals are scores less than or equal to the Bad Threshold.
            Neutral signals fall in between.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-6">
          <div className="space-y-3">
            <Label htmlFor="good-threshold" className="text-lg font-medium">Good Signal Threshold: <span className="text-primary font-semibold">{formatPercentage(goodThreshold)}</span></Label>
            <div className="flex items-center space-x-4">
              <Slider
                id="good-threshold"
                min={0}
                max={1}
                step={0.01}
                value={[goodThreshold]}
                onValueChange={handleGoodThresholdChange}
                aria-label="Good signal threshold"
                className="flex-1"
              />
            </div>
             <p className="text-sm text-muted-foreground">Signals with scores ≥ {formatPercentage(goodThreshold)} will be marked as <span className="text-green-600 font-medium">GOOD</span>.</p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="bad-threshold" className="text-lg font-medium">Bad Signal Threshold: <span className="text-destructive font-semibold">{formatPercentage(badThreshold)}</span></Label>
             <div className="flex items-center space-x-4">
              <Slider
                id="bad-threshold"
                min={0}
                max={1}
                step={0.01}
                value={[badThreshold]}
                onValueChange={handleBadThresholdChange}
                aria-label="Bad signal threshold"
                className="flex-1"
              />
            </div>
            <p className="text-sm text-muted-foreground">Signals with scores ≤ {formatPercentage(badThreshold)} will be marked as <span className="text-red-600 font-medium">BAD</span>.</p>
          </div>

          <div className="space-y-1 text-center p-4 border rounded-md bg-muted/50">
            <p className="text-lg font-medium">Neutral Signal Range</p>
            {badThreshold < goodThreshold ? (
                 <p className="text-muted-foreground">
                    Signals with scores &gt; <span className="text-red-600 font-medium">{formatPercentage(badThreshold)}</span> and &lt; <span className="text-green-600 font-medium">{formatPercentage(goodThreshold)}</span> will be marked as <span className="text-yellow-600 font-medium">NEUTRAL</span>.
                 </p>
            ) : (
                 <p className="text-muted-foreground">
                    Currently, there is no range for Neutral signals as Bad threshold is not less than Good threshold.
                 </p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveThresholds} disabled={isSaving || !hasChanges}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SignalSettingsPage;

