
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckSquare, Edit3, ListChecks, PlusCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { saveUserStandardMetricsPreference, hasUserSetAnyMetrics } from '@/services/targetMetricsService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast as sonnerToast } from 'sonner';

const TargetSelectionPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: hasMetrics, isLoading: isLoadingHasMetrics } = useQuery({
    queryKey: ['hasUserSetAnyMetrics', user?.id],
    queryFn: () => user ? hasUserSetAnyMetrics(user.id, user.user_metadata?.account_id || '') : false,
    enabled: !!user,
  });
  
  const mutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("User not authenticated.");
      return saveUserStandardMetricsPreference(user.id, user.user_metadata?.account_id || '');
    },
    onSuccess: () => {
      sonnerToast.success("Standard metrics preference saved. Redirecting to Toolkit Hub...");
      queryClient.invalidateQueries({ queryKey: ['hasUserSetAnyMetrics', user?.id] });
      navigate('/toolkit-hub');
    },
    onError: (error: Error) => {
      sonnerToast.error(`Error: ${error.message}`);
    }
  });

  const handleUseStandardMetrics = () => {
    mutation.mutate();
  };

  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-80px)] py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-primary">
          Define Your Target Metrics
        </h1>
        <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
          Choose how you want to set up your target metrics. You can use our predefined standard metrics
          or create your own custom sets.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <Card className="flex flex-col">
          <CardHeader>
            <CheckSquare className="h-12 w-12 text-green-500 mb-4" />
            <CardTitle className="text-2xl">Use Standard Metrics</CardTitle>
            <CardDescription>
              Get started quickly with a comprehensive set of predefined industry-standard metrics.
              Ideal for a general overview and quick setup.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            {/* Additional details about standard metrics can go here */}
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={handleUseStandardMetrics}
              disabled={mutation.isPending || isLoadingHasMetrics}
            >
              {mutation.isPending ? "Saving..." : "Use Standard Metrics"}
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <Edit3 className="h-12 w-12 text-blue-500 mb-4" />
            <CardTitle className="text-2xl">Create Custom Metric Set</CardTitle>
            <CardDescription>
              Tailor your analysis by defining specific metrics and target values that matter most to your business.
              Build one or more sets for different scenarios.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
             {/* Additional details about custom metrics can go here */}
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-2">
            <Button className="w-full sm:w-auto flex-1" asChild>
              <Link to="/target-metrics-builder">
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Set
              </Link>
            </Button>
            {hasMetrics && (
              <Button variant="outline" className="w-full sm:w-auto flex-1" asChild>
                <Link to="/target-metric-sets">
                  <ListChecks className="mr-2 h-4 w-4" /> View My Sets
                </Link>
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default TargetSelectionPage;
