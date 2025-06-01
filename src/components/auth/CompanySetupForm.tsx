
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { companyCategoriesData, CompanySubcategory } from '@/data/companyCategories';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
  const [availableSubcategories, setAvailableSubcategories] = useState<CompanySubcategory[]>([]);

  const handleCategoryChange = (value: string) => {
    setCompanyCategory(value);
    const selectedCategoryData = companyCategoriesData.find(cat => cat.name === value);
    setAvailableSubcategories(selectedCategoryData ? selectedCategoryData.subcategories : []);
    setCompanySubcategory(""); 
  };

  const handleCompanySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName) {
      toast.error("Please enter your company name.");
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
        throw functionError;
      }
      
      toast.success('Company setup completed successfully!');
      navigate('/target-selection');
    } catch (error: any) {
      console.error('Error setting up company:', error);
      toast.error(`Failed to set up company: ${error.message}. Please contact support.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[400px] md:w-[550px]">
        <CardHeader>
          <CardTitle>Company Setup</CardTitle>
          <CardDescription>Set up your company information to complete registration.</CardDescription>
        </CardHeader>
        <form onSubmit={handleCompanySetup}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="setup-companyname">Company Name <span className="text-destructive">*</span></Label>
              <Input
                id="setup-companyname"
                type="text"
                placeholder="Acme Corp"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                autoComplete="organization"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-companyaddress">Company Address</Label>
              <Input
                id="setup-companyaddress"
                type="text"
                placeholder="123 Main St, Anytown, USA"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                autoComplete="street-address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="setup-companycategory">Category</Label>
                <Select onValueChange={handleCategoryChange} value={companyCategory}>
                  <SelectTrigger id="setup-companycategory">
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
                <Label htmlFor="setup-companysubcategory">Subcategory</Label>
                <Select 
                  onValueChange={setCompanySubcategory} 
                  value={companySubcategory}
                  disabled={!companyCategory || availableSubcategories.length === 0}
                >
                  <SelectTrigger id="setup-companysubcategory">
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
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Setting up company...' : 'Complete Setup'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default CompanySetupForm;
