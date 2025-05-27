
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Account, fetchUserAccountsWithAdminRole, updateAccountDetailsService } from '@/services/accountService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle, MinusCircle } from 'lucide-react';

const SignalThresholdSettingsPage: React.FC = () => {
  const { user, authLoading } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [goodThreshold, setGoodThreshold] = useState<string>(''); // Stored as string for input, converted to %
  const [badThreshold, setBadThreshold] = useState<string>('');   // Stored as string for input, converted to %
  const [isSaving, setIsSaving] = useState(false);

  const fetchAccountData = useCallback(async () => {
    if (user && !authLoading) {
      setIsLoading(true);
      try {
        const accounts = await fetchUserAccountsWithAdminRole(user.id);
        if (accounts && accounts.length > 0) {
          const currentAccount = accounts[0];
          setAccount(currentAccount);
          // Convert decimal to percentage string for display
          setGoodThreshold((currentAccount.signal_good_threshold * 100).toString());
          setBadThreshold((currentAccount.signal_bad_threshold * 100).toString());
        } else {
          toast.error("No admin account found to manage settings.");
          setAccount(null);
        }
      } catch (error) {
        toast.error("Failed to load account settings.");
        console.error("Error fetching account settings:", error);
      } finally {
        setIsLoading(false);
      }
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    fetchAccountData();
  }, [fetchAccountData]);

  const handleSaveThresholds = async () => {
    if (!account) {
      toast.error("No account selected to save settings.");
      return;
    }

    const goodVal = parseFloat(goodThreshold);
    const badVal = parseFloat(badThreshold);

    if (isNaN(goodVal) || isNaN(badVal)) {
      toast.error("Threshold values must be numbers.");
      return;
    }

    if (goodVal < 0 || goodVal > 100 || badVal < 0 || badVal > 100) {
      toast.error("Thresholds must be between 0 and 100.");
      return;
    }

    if (badVal >= goodVal) {
      toast.error("Bad signal threshold must be less than Good signal threshold.");
      return;
    }

    setIsSaving(true);
    try {
      const updatedAccount = await updateAccountDetailsService(account.id, {
        signal_good_threshold: goodVal / 100, // Convert percentage to decimal for storage
        signal_bad_threshold: badVal / 100,   // Convert percentage to decimal for storage
      });
      if (updatedAccount) {
        setAccount(updatedAccount);
        // Refresh form values from potentially updated data (though service returns it)
        setGoodThreshold((updatedAccount.signal_good_threshold * 100).toString());
        setBadThreshold((updatedAccount.signal_bad_threshold * 100).toString());
        toast.success("Signal thresholds updated successfully!");
      } else {
        // Error toast is handled by the service
      }
    } catch (error) {
      toast.error("Failed to save signal thresholds.");
      console.error("Error saving thresholds:", error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const currentGoodThreshold = parseFloat(goodThreshold);
  const currentBadThreshold = parseFloat(badThreshold);

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary">Signal Threshold Settings</h1>
        <p className="text-muted-foreground">
          Define the score ranges for Good, Neutral, and Bad signals for your account.
          Scores are percentages (0-100%).
        </p>
      </div>

      {isLoading || authLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="mt-6 p-4 border rounded-md bg-muted/50">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-full" />
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-24" />
          </CardFooter>
        </Card>
      ) : !account ? (
        <Card>
          <CardHeader>
            <CardTitle>No Account Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Could not load account information. Please ensure you are an administrator of an account.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Configure Thresholds for: {account.name}</CardTitle>
            <CardDescription>
              Set the percentage values that determine how signals are categorized.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="goodThreshold" className="flex items-center text-lg font-medium mb-1">
                <CheckCircle className="h-5 w-5 mr-2 text-green-500" /> Good Signal Threshold (%)
              </Label>
              <p className="text-sm text-muted-foreground mb-2">Scores greater than or equal to this value are considered 'Good'.</p>
              <Input
                id="goodThreshold"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={goodThreshold}
                onChange={(e) => setGoodThreshold(e.target.value)}
                className="text-base"
                placeholder="e.g., 75"
              />
            </div>

            <div>
              <Label htmlFor="badThreshold" className="flex items-center text-lg font-medium mb-1">
                <AlertCircle className="h-5 w-5 mr-2 text-red-500" /> Bad Signal Threshold (%)
              </Label>
              <p className="text-sm text-muted-foreground mb-2">Scores less than or equal to this value are considered 'Bad'.</p>
              <Input
                id="badThreshold"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={badThreshold}
                onChange={(e) => setBadThreshold(e.target.value)}
                className="text-base"
                placeholder="e.g., 50"
              />
            </div>
            
            <div className="mt-6 p-4 border rounded-md bg-muted/50">
              <h4 className="text-md font-semibold mb-2 flex items-center">
                <MinusCircle className="h-5 w-5 mr-2 text-yellow-500" /> Current Signal Ranges:
              </h4>
              {!isNaN(currentGoodThreshold) && !isNaN(currentBadThreshold) && currentBadThreshold < currentGoodThreshold ? (
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li><strong className="text-green-600">Good:</strong> Score ≥ {currentGoodThreshold}%</li>
                  <li><strong className="text-yellow-600">Neutral:</strong> {currentBadThreshold}% &lt; Score &lt; {currentGoodThreshold}%</li>
                  <li><strong className="text-red-600">Bad:</strong> Score ≤ {currentBadThreshold}%</li>
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Enter valid threshold values above to see ranges.</p>
              )}
            </div>

          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveThresholds} disabled={isSaving || isLoading}>
              {isSaving ? 'Saving...' : 'Save Thresholds'}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default SignalThresholdSettingsPage;

