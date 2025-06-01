
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { companyCategoriesData, CompanySubcategory } from '@/data/companyCategories';
import { toast } from 'sonner';

const SignUpForm: React.FC = () => {
  const { signUpWithEmail, authLoading } = useAuth(); // Updated: authLoading
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyCategory, setCompanyCategory] = useState('');
  const [companySubcategory, setCompanySubcategory] = useState('');
  const [availableSubcategories, setAvailableSubcategories] = useState<CompanySubcategory[]>([]);

  const handleCategoryChange = (value: string) => {
    setCompanyCategory(value);
    const selectedCategoryData = companyCategoriesData.find(cat => cat.name === value);
    setAvailableSubcategories(selectedCategoryData ? selectedCategoryData.subcategories : []);
    setCompanySubcategory(""); 
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !firstName || !lastName || !companyName) {
      toast.error("Please fill in all required fields for sign up (Email, Password, First Name, Last Name, Company Name).");
      return;
    }
    setIsSubmitting(true);
    await signUpWithEmail(
      email,
      password,
      firstName,
      lastName,
      companyName,
      companyAddress || null,
      companyCategory || null,
      companySubcategory || null
    );
    setIsSubmitting(false);
    // Toasts handled by service/context
  };

  return (
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
              autoComplete="organization"
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
              autoComplete="street-address"
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
          <Button type="submit" className="w-full" disabled={isSubmitting || authLoading}>
            {isSubmitting || authLoading ? 'Signing Up...' : 'Sign Up & Create Company'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default SignUpForm;
