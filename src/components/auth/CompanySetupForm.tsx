
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { companyCategoriesData } from '@/data/companyCategories';

interface CompanySetupFormProps {
  userId: string;
}

const CompanySetupForm: React.FC<CompanySetupFormProps> = ({ userId }) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyCategory, setCompanyCategory] = useState('');
  const [companySubcategory, setCompanySubcategory] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyName) {
      toast.error("Please enter a company name.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Call Edge Function to create account and membership
      const { error: functionError } = await supabase.functions.invoke('create-account-and-admin', {
        body: { 
          userId,
          companyName,
          companyAddress: companyAddress || null,
          companyCategory: companyCategory || null,
          companySubcategory: companySubcategory || null
        },
      });

      if (functionError) {
        console.error('Error creating company account/admin role:', functionError);
        toast.error(`Failed to set up company: ${functionError.message}. Please contact support.`);
        return;
      }
      
      toast.success('Company setup completed! Let\'s set up your target metrics...');
      navigate('/target-selection');
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
            Please provide your company information to complete your account setup.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
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
