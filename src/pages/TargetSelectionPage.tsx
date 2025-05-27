
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { SlidersHorizontal, Target as TargetIcon, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { saveUserStandardMetricsPreference } from '@/services/targetMetricsService';
import { toast } from 'sonner';

const TargetSelectionPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleUseStandardTargets = async () => {
    if (!user) {
      toast.error("You need to be logged in to set target preferences");
      return;
    }

    try {
      await saveUserStandardMetricsPreference(user.id);
      toast.success("Standard targets selected successfully!");
      navigate('/toolkit-hub');
    } catch (error) {
      console.error("Error saving standard metrics preference:", error);
      toast.error("Failed to select standard targets. Please try again.");
    }
  };

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-primary mb-3">Choose Your Target Approach</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Select how you'd like to define targets for your market analysis. You can use standard, pre-defined targets or create your own.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <Card className="flex flex-col">
          <CardHeader className="items-center text-center">
            <SlidersHorizontal size={48} className="text-primary mb-4" />
            <CardTitle className="text-2xl">Use Standard Targets</CardTitle>
            <CardDescription>
              Get started quickly with pre-defined targets. These are typically set by an administrator for general use.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow" />
          <CardFooter className="flex justify-center">
            <Button size="lg" className="w-full md:w-auto" onClick={handleUseStandardTargets}>
              Proceed with Standard Targets <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="items-center text-center">
            <TargetIcon size={48} className="text-primary mb-4" />
            <CardTitle className="text-2xl">Set Custom Targets</CardTitle>
            <CardDescription>
              Tailor your analysis by building your own specific target metrics. This allows for more granular control.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow" />
          <CardFooter className="flex justify-center">
            <Button asChild size="lg" variant="outline" className="w-full md:w-auto">
              <Link to="/target-metrics-builder">
                Build Custom Targets <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default TargetSelectionPage;
