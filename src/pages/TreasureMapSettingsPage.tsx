
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { getAccountThresholds } from '@/services/targetMetrics/accountHelpers';

const TreasureMapSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [goodThreshold, setGoodThreshold] = useState<number>(0.75);
  const [badThreshold, setBadThreshold] = useState<number>(0.50);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Fetch account-specific thresholds here if needed
    // For now, using default values
  }, [user]);

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // Save settings to database here
      toast.success('Settings saved successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Treasure Map Settings</CardTitle>
          <CardDescription>Configure the thresholds for your treasure map.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="good-threshold" className="block text-sm font-medium text-gray-700">
              Good Threshold
            </label>
            <input
              type="number"
              id="good-threshold"
              className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
              value={goodThreshold}
              onChange={(e) => setGoodThreshold(parseFloat(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="bad-threshold" className="block text-sm font-medium text-gray-700">
              Bad Threshold
            </label>
            <input
              type="number"
              id="bad-threshold"
              className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
              value={badThreshold}
              onChange={(e) => setBadThreshold(parseFloat(e.target.value))}
            />
          </div>
        </CardContent>
        <Button onClick={handleSaveSettings} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Settings'}
        </Button>
      </Card>
    </div>
  );
};

export default TreasureMapSettingsPage;
