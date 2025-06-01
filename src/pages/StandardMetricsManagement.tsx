
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  getStandardMetrics,
  deleteStandardMetric
} from '@/services/standardMetricsService';
import { StandardMetric } from '@/types/standardMetrics';

const StandardMetricsManagement: React.FC = () => {
  const [standardMetrics, setStandardMetrics] = useState<StandardMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStandardMetrics();
  }, []);

  const fetchStandardMetrics = async () => {
    try {
      const metrics = await getStandardMetrics();
      setStandardMetrics(metrics);
    } catch (error) {
      console.error('Error fetching standard metrics:', error);
      toast.error('Failed to load standard metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteStandardMetric();
      toast.success('Standard metric deleted successfully');
      fetchStandardMetrics();
    } catch (error) {
      console.error('Error deleting standard metric:', error);
      toast.error('Failed to delete standard metric');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Standard Metrics Management</CardTitle>
          <CardDescription>
            Manage standard metrics available across all accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Standard metrics functionality has been simplified. This page is kept for backward compatibility.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StandardMetricsManagement;
