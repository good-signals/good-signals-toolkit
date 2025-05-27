import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { companyCategoriesData, CompanySubcategory } from '@/data/companyCategories';

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
  const [availableSubcategories, setAvailableSubcategories] = useState<CompanySubcategory[]>([]);


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
    // Category and Subcategory are optional from the UI perspective as per original logic (pass null if empty)
    // but with dropdowns, they'll likely always have a value if interacted with.
    // If not interacted with, they remain empty strings, which is fine.
    await signUpWithEmail(
      signUpEmail,
      signUpPassword,
      firstName,
      lastName,
      companyName,
      companyAddress || null, 
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

  const handleCategoryChange = (value: string) => {
    setCompanyCategory(value);
    const selectedCategoryData = companyCategoriesData.find(cat => cat.name === value);
    setAvailableSubcategories(selectedCategoryData ? selectedCategoryData.subcategories : []);
    setCompanySubcategory(""); // Reset subcategory when category changes
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Tabs defaultValue="signup" className="w-[400px] md:w-[550px]"> {/* Increased width for new fields */}
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
                    <Select onValueChange={handleCategoryChange} value={companyCategory}>
                      <SelectTrigger id="signup-companycategory">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Categories</SelectLabel>
                          {companyCategoriesData.map((cat) => (
                            <SelectItem key={cat.name} value={cat.name}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-companysubcategory">Subcategory</Label>
                    <Select 
                      onValueChange={setCompanySubcategory} 
                      value={companySubcategory}
                      disabled={!companyCategory || availableSubcategories.length === 0}
                    >
                      <SelectTrigger id="signup-companysubcategory">
                        <SelectValue placeholder="Select subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Subcategories</SelectLabel>
                          {availableSubcategories.map((subcat) => (
                            <SelectItem key={subcat.name} value={subcat.name}>
                              {subcat.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
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
