
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { hasUserSetAnyMetrics } from '@/services/targetMetricsService';
import { supabase } from '@/integrations/supabase/client';
import SignInForm from '@/components/auth/SignInForm';
import SignUpForm from '@/components/auth/SignUpForm';

const AuthPage: React.FC = () => {
  const { user, session, authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to the appropriate page
  useEffect(() => {
    const redirectAuthenticatedUser = async () => {
      if (user && session && !authLoading) {
        try {
          const hasSetMetrics = await hasUserSetAnyMetrics(user.id);
          
          if (hasSetMetrics) {
            navigate('/toolkit-hub', { replace: true });
          } else {
            navigate('/target-selection', { replace: true });
          }
        } catch (error) {
          console.error("Error checking user metrics:", error);
          // On error, default to toolkit hub
          navigate('/toolkit-hub', { replace: true });
        }
      }
    };

    redirectAuthenticatedUser();
  }, [user, session, authLoading, navigate]);

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <p className="text-lg">Loading authentication state...</p>
        </div>
      </div>
    );
  }

  // Don't show the forms if user is authenticated (they will be redirected)
  if (user && session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <p className="text-lg">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Show the sign-in/sign-up forms for unauthenticated users
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
