
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import SignInForm from '@/components/auth/SignInForm';
import SignUpForm from '@/components/auth/SignUpForm';
import { hasUserSetAnyMetrics } from '@/services/targetMetricsService';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser, session: currentSession, authLoading } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      // Don't process if still loading auth or already redirecting
      if (authLoading || isRedirecting) {
        console.log('AuthPage: Waiting for auth or already redirecting', { authLoading, isRedirecting });
        return;
      }

      // Only proceed if we have both user and session
      if (!currentUser || !currentSession) {
        console.log('AuthPage: No user or session, staying on auth page');
        return;
      }

      console.log('AuthPage: User authenticated, checking redirect path');
      setIsRedirecting(true);

      try {
        // Check if the user has already set target metrics
        const hasSetMetrics = await hasUserSetAnyMetrics(currentUser.id);
        
        if (hasSetMetrics) {
          console.log('AuthPage: User has metrics, redirecting to toolkit hub');
          toast.success("Welcome back! Redirecting to Toolkit Hub...");
          navigate('/toolkit-hub', { replace: true });
        } else {
          console.log('AuthPage: New user, redirecting to target selection');
          toast.success("Welcome! Let's set up your target metrics...");
          navigate('/target-selection', { replace: true });
        }
      } catch (error) {
        console.error("AuthPage: Error checking user metrics:", error);
        // On error, default to toolkit hub
        toast.error("Error checking setup. Redirecting to Toolkit Hub...");
        navigate('/toolkit-hub', { replace: true });
      } finally {
        // Reset redirecting state after a delay to prevent loops
        setTimeout(() => setIsRedirecting(false), 1000);
      }
    };
    
    checkUserAndRedirect();
  }, [currentUser, currentSession, authLoading, navigate, isRedirecting]);

  // Show loading state while auth is loading or redirecting
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <p className="text-lg">Loading authentication state...</p>
        </div>
      </div>
    );
  }

  if (isRedirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <p className="text-lg">Redirecting...</p>
        </div>
      </div>
    );
  }

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
