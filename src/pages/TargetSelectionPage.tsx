
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckSquare, Edit3, ListChecks, PlusCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { saveUserStandardMetricsPreference, hasUserSetAnyMetrics } from '@/services/targetMetricsService';
import { getUserAccount } from '@/services/userAccountService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast as sonnerToast } from 'sonner';

const TargetSelectionPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch user's account information
  const { data: userAccount, isLoading: isLoadingAccount, error: accountError } = useQuery({
    queryKey: ['userAccount', user?.id],
    queryFn: () => user ? getUserAccount(user.id) : null,
    enabled: !!user,
  });

  const accountId = userAccount?.id || '';

  const { data: hasMetrics, isLoading: isLoadingHasMetrics } = useQuery({
    queryKey: ['hasUserSetAnyMetrics', user?.id],
    queryFn: () => user && accountId ? hasUserSetAnyMetrics(user.id, accountId) : false,
    enabled: !!user && !!accountId,
  });
  
  const mutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("User not authenticated.");
      if (!accountId) throw new Error("Account ID not found. Please contact support.");
      return saveUserStandardMetricsPreference(user.id, accountId);
    },
    onSuccess: (result) => {
      sonnerToast.success(`Standard metrics "${result.metricSetName}" added successfully! Redirecting to Toolkit Hub...`);
      queryClient.invalidateQueries({ queryKey: ['hasUserSetAnyMetrics', user?.id] });
      navigate('/toolkit-hub');
    },
    onError: (error: Error) => {
      console.error('Error saving standard metrics:', error);
      sonnerToast.error(`Error: ${error.message}`);
    }
  });

  const handleUseStandardMetrics = () => {
    if (!accountId) {
      sonnerToast.error('Account information not found. Please try refreshing the page or contact support.');
      return;
    }
    mutation.mutate();
  };

  // Show loading state while fetching user or account data
  if (!user || isLoadingAccount) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-80px)]">
        <p>Loading user information...</p>
      </div>
    );
  }

  // Show error state if account fetch failed or no account found
  if (accountError || !userAccount) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="text-center">
          <p className="text-lg mb-4">Account information not found.</p>
          <p className="text-sm text-muted-foreground mb-4">
            It looks like your company setup may not have completed successfully.
          </p>
          <Button onClick={() => navigate('/company-setup')}>
            Complete Company Setup
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-80px)] py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-primary">
          Define Your Target Metrics
        </h1>
        <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
          Choose how you want to set up your target metrics for <strong>{userAccount.name}</strong>. 
          You can use our predefined standard metrics or create your own custom sets.
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
              {mutation.isPending ? "Adding Standard Metrics..." : "Use Standard Metrics"}
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
