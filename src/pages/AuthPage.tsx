
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import SignInForm from '@/components/auth/SignInForm';
import SignUpForm from '@/components/auth/SignUpForm';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import { hasUserSetAnyMetrics } from '@/services/targetMetricsService';
import { supabase } from '@/integrations/supabase/client';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser, session: currentSession, authLoading } = useAuth();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const [isHandlingConfirmation, setIsHandlingConfirmation] = useState(false);

  // Handle email confirmation tokens
  useEffect(() => {
    const handleEmailConfirmation = async () => {
      const token_hash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      
      if (token_hash && type === 'email') {
        setIsHandlingConfirmation(true);
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: 'email'
          });
          
          if (error) {
            console.error('Email confirmation error:', error);
            toast.error('Email confirmation failed. Please try again.');
          } else if (data.user) {
            toast.success('Email confirmed successfully! Now let\'s set up your company.');
          }
        } catch (error) {
          console.error('Email confirmation error:', error);
          toast.error('Email confirmation failed. Please try again.');
        } finally {
          setIsHandlingConfirmation(false);
        }
      }
    };

    handleEmailConfirmation();
  }, [searchParams]);

  // Handle authenticated user redirects
  useEffect(() => {
    const checkUserAndRedirect = async () => {
      if (currentUser && currentSession && !authLoading && !isHandlingConfirmation) {
        try {
          // Check if user has set up their company by checking if they have metrics
          const hasSetMetrics = await hasUserSetAnyMetrics(currentUser.id, currentUser.id);
          
          if (hasSetMetrics) {
            // User has already completed setup, redirect to toolkit hub
            toast.success("Welcome back! Redirecting to Toolkit Hub...");
            navigate('/toolkit-hub');
          } else {
            // Check if user has confirmed their email and needs company setup
            if (currentUser.email_confirmed_at) {
              toast.success("Email confirmed! Let's set up your company...");
              navigate('/company-setup');
            } else {
              // User needs to confirm email first
              toast.info("Please check your email to confirm your account.");
            }
          }
        } catch (error) {
          console.error("Error checking user setup status:", error);
          // On error, try company setup - the page will handle redirects appropriately
          navigate('/company-setup');
        }
      }
    };
    
    checkUserAndRedirect();
  }, [currentUser, currentSession, authLoading, isHandlingConfirmation, navigate]);

  // Show loading state while handling authentication
  if (authLoading || isHandlingConfirmation) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <p className="text-lg">
            {isHandlingConfirmation ? 'Confirming your email...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-[400px] md:w-[550px]">
          <ForgotPasswordForm onBackToSignIn={() => setShowForgotPassword(false)} />
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
          <SignInForm onForgotPassword={() => setShowForgotPassword(true)} />
        </TabsContent>
        <TabsContent value="signup">
          <SignUpForm />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AuthPage;
