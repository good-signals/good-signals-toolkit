
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { signInWithEmail, signUpWithEmail, loading, user: currentUser, session: currentSession } = useAuth();

  // Sign In states
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Sign Up states
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyCategory, setCompanyCategory] = useState('');
  const [companySubcategory, setCompanySubcategory] = useState('');


  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmail || !signInPassword) {
      toast.error("Please enter both email and password for sign in.");
      return;
    }
    await signInWithEmail(signInEmail, signInPassword);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpEmail || !signUpPassword || !firstName || !lastName || !companyName) {
      toast.error("Please fill in all required fields for sign up (Email, Password, First Name, Last Name, Company Name).");
      return;
    }
    await signUpWithEmail(
      signUpEmail,
      signUpPassword,
      firstName,
      lastName,
      companyName,
      companyAddress || null, // Pass null if empty
      companyCategory || null,
      companySubcategory || null
    );
  };

  useEffect(() => {
    if (currentUser && currentSession) {
      toast.success("Redirecting to Toolkit Hub...");
      navigate('/toolkit-hub'); 
    }
  }, [currentUser, currentSession, navigate]);


  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Tabs defaultValue="signin" className="w-[400px] md:w-[500px]">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="signin">
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
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle>Sign Up</CardTitle>
              <CardDescription>Create a new account and set up your company.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSignUp}>
              <CardContent className="space-y-4">
                <p className="text-sm font-medium text-foreground">Admin Information</p>
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
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email <span className="text-destructive">*</span></Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="m@example.com"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password <span className="text-destructive">*</span></Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    required
                  />
                </div>
                
                <p className="text-sm font-medium text-foreground pt-4">Company Information</p>
                 <div className="space-y-2">
                  <Label htmlFor="signup-companyname">Company Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="signup-companyname"
                    type="text"
                    placeholder="Acme Corp"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-companyaddress">Company Address</Label>
                  <Input
                    id="signup-companyaddress"
                    type="text"
                    placeholder="123 Main St, Anytown, USA"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-companycategory">Category</Label>
                    <Input
                      id="signup-companycategory"
                      type="text"
                      placeholder="e.g., Retail, Restaurant"
                      value={companyCategory}
                      onChange={(e) => setCompanyCategory(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-companysubcategory">Subcategory</Label>
                    <Input
                      id="signup-companysubcategory"
                      type="text"
                      placeholder="e.g., Coffee Shop, QSR"
                      value={companySubcategory}
                      onChange={(e) => setCompanySubcategory(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing Up...' : 'Sign Up & Create Company'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AuthPage;
