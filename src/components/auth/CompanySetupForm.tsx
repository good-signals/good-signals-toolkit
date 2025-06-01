import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { signUpWithEmailService } from '@/services/authService';
import { companyCategoriesData } from '@/data/companyCategories';

interface CompanySetupFormProps {
  userId: string;
}

const CompanySetupForm: React.FC<CompanySetupFormProps> = ({ userId }) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyCategory, setCompanyCategory] = useState('');
  const [companySubcategory, setCompanySubcategory] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !firstName || !lastName || !companyName) {
      toast.error("Please fill in all required fields.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { user, session, error } = await signUpWithEmailService(
        email,
        password,
        firstName,
        lastName,
        companyName,
        companyAddress || null,
        companyCategory || null,
        companySubcategory || null
      );

      if (error) {
        console.error('Company setup error:', error.message);
        return;
      }

      if (session) {
        // User is confirmed and signed in, redirect to target selection
        toast.success('Company setup completed! Let\'s set up your target metrics...');
        navigate('/target-selection');
      } else {
        // User needs email confirmation, still redirect to target selection
        toast.success('Company setup completed! Please check your email to confirm your account, then set up your target metrics.');
        navigate('/target-selection');
      }
    } catch (error: any) {
      console.error('Error during company setup:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategory = companyCategoriesData.find(cat => cat.name === companyCategory);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Complete Your Company Setup</CardTitle>
          <CardDescription>
            Please provide your personal and company information to complete your account setup.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
                <Input
                  id="lastName"
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
              <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
              <Input
                id="email"
                type="email"
                placeholder="john@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
              <Input
                id="password"
                type="password"
                placeholder="Choose a secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name <span className="text-destructive">*</span></Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Your Company Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                autoComplete="organization"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyAddress">Company Address</Label>
              <Input
                id="companyAddress"
                type="text"
                placeholder="123 Main St, City, State, ZIP"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                autoComplete="street-address"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyCategory">Company Category</Label>
                <Select value={companyCategory} onValueChange={setCompanyCategory}>
                  <SelectTrigger id="companyCategory">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {companyCategoriesData.map((category) => (
                      <SelectItem key={category.name} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companySubcategory">Company Subcategory</Label>
                <Select 
                  value={companySubcategory} 
                  onValueChange={setCompanySubcategory}
                  disabled={!selectedCategory}
                >
                  <SelectTrigger id="companySubcategory">
                    <SelectValue placeholder="Select subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCategory?.subcategories.map((subcategory) => (
                      <SelectItem key={subcategory.name} value={subcategory.name}>
                        {subcategory.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Setting up your company...' : 'Complete Setup'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default CompanySetupForm;
