
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Mail } from 'lucide-react';

const SignUpForm: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !firstName || !lastName) {
      toast.error("Please fill in all required fields.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      const redirectUrl = `${window.location.origin}/auth`;
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) {
        console.error('Error signing up:', signUpError.message);
        toast.error(signUpError.message || 'Sign up failed. Please try again.');
        return;
      }

      if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
        toast.info('User already exists but is unconfirmed. Please check your email to confirm your account or try signing in.');
        return;
      }
      
      if (!signUpData.user) {
        toast.error('Sign up process did not return a user. If you are already registered, please try signing in.');
        return;
      }

      // Show email confirmation message instead of redirecting
      setShowEmailConfirmation(true);
      toast.success('Account created! Please check your email to confirm your account.');
    } catch (error: any) {
      console.error('Error during sign up:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showEmailConfirmation) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>Check Your Email</CardTitle>
          <CardDescription>
            We've sent a confirmation link to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span>Click the link in your email to confirm your account</span>
          </div>
          <p className="text-sm text-muted-foreground">
            After confirming, you'll be able to set up your company information.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setShowEmailConfirmation(false)}
          >
            Back to Sign Up
          </Button>
          <Button 
            variant="ghost" 
            className="w-full"
            onClick={() => navigate('/auth')}
          >
            Already confirmed? Sign In
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Enter your personal information to get started.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSignUp}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="signup-firstname">First Name <span className="text-destructive">*</span></Label>
              <Input
                id="signup-firstname"
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-lastname">Last Name <span className="text-destructive">*</span></Label>
              <Input
                id="signup-lastname"
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                autoComplete="family-name"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-email">Email <span className="text-destructive">*</span></Label>
            <Input
              id="signup-email"
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-password">Password <span className="text-destructive">*</span></Label>
            <Input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default SignUpForm;
