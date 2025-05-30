
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { hasUserSetAnyMetrics } from '@/services/targetMetricsService';
import { supabase } from '@/integrations/supabase/client';

const SignInForm: React.FC = () => {
  const { signInWithEmail } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please enter both email and password for sign in.");
      return;
    }
    
    console.log('SignInForm: Starting sign-in process...');
    setIsSubmitting(true);
    
    try {
      console.log('SignInForm: Calling signInWithEmail...');
      await signInWithEmail(email, password);
      console.log('SignInForm: signInWithEmail completed successfully');
      
      // After successful sign-in, check if user has metrics and redirect accordingly
      // Get the session to get the user ID
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        try {
          const hasSetMetrics = await hasUserSetAnyMetrics(session.user.id);
          
          if (hasSetMetrics) {
            console.log('SignInForm: User has metrics, redirecting to toolkit hub');
            toast.success("Welcome back! Redirecting to Toolkit Hub...");
            navigate('/toolkit-hub', { replace: true });
          } else {
            console.log('SignInForm: New user, redirecting to target selection');
            toast.success("Welcome! Let's set up your target metrics...");
            navigate('/target-selection', { replace: true });
          }
        } catch (error) {
          console.error("SignInForm: Error checking user metrics:", error);
          // On error, default to toolkit hub
          toast.error("Error checking setup. Redirecting to Toolkit Hub...");
          navigate('/toolkit-hub', { replace: true });
        }
      }
      
    } catch (error) {
      console.error('SignInForm: Sign in error:', error);
      toast.error('Sign in failed. Please check your credentials and try again.');
      setIsSubmitting(false); // Only reset on error
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Enter your credentials to access your account.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSignIn}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signin-email">Email</Label>
            <Input
              id="signin-email"
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signin-password">Password</Label>
            <Input
              id="signin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={isSubmitting}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default SignInForm;
