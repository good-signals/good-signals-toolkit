
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const SignUpForm: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
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

      if (signUpData.session) {
        // User is confirmed and signed in, redirect to company setup
        toast.success('Account created successfully! Please set up your company.');
        navigate('/company-setup');
      } else {
        // User needs email confirmation, redirect to company setup with userId
        toast.success('Account created successfully! Please set up your company information and check your email to confirm your account.');
        navigate(`/company-setup?userId=${signUpData.user.id}`);
      }
    } catch (error: any) {
      console.error('Error during sign up:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
