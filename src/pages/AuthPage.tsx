import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import SignInForm from '@/components/auth/SignInForm';
import SignUpForm from '@/components/auth/SignUpForm';
import { hasUserSetAnyMetrics } from '@/services/targetMetricsService';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser, session: currentSession } = useAuth();

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      if (currentUser && currentSession) {
        try {
          // Check if the user has already set target metrics
          const hasSetMetrics = await hasUserSetAnyMetrics(currentUser.id);
          
          if (hasSetMetrics) {
            // User has already set metrics, redirect to toolkit hub
            toast.success("Welcome back! Redirecting to Toolkit Hub...");
            navigate('/toolkit-hub');
          } else {
            // New user or user hasn't set metrics yet, redirect to target selection
            toast.success("Welcome! Let's set up your target metrics...");
            navigate('/target-selection');
          }
        } catch (error) {
          console.error("Error checking user metrics:", error);
          // On error, default to toolkit hub
          toast.error("Error checking setup. Redirecting to Toolkit Hub...");
          navigate('/toolkit-hub');
        }
      }
    };
    
    checkUserAndRedirect();
  }, [currentUser, currentSession, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Tabs defaultValue="signup" className="w-[400px] md:w-[550px]">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="signin">
          <SignInForm />
        </TabsContent>
        <TabsContent value="signup">
          <SignUpForm />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AuthPage;
