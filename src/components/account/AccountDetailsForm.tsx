import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Account, updateAccountDetailsService } from '@/services/account';
import { companyCategories } from '@/data/companyCategories';

interface AccountDetailsFormProps {
  account: Account;
  onAccountUpdate: (updatedAccount: Account) => void;
}

const AccountDetailsForm: React.FC<AccountDetailsFormProps> = ({ account, onAccountUpdate }) => {
  const [name, setName] = useState(account.name || '');
  const [category, setCategory] = useState(account.category || '');
  const [subcategory, setSubcategory] = useState(account.subcategory || '');
  const [address, setAddress] = useState(account.address || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setIsUpdating(true);
    try {
      const updates = {
        name,
        category,
        subcategory,
        address,
      };

      const updatedAccount = await updateAccountDetailsService(account.id, updates);

      if (updatedAccount) {
        onAccountUpdate(updatedAccount);
        toast.success("Account details updated successfully!");
      } else {
        toast.error("Failed to update account details.");
      }
    } catch (error) {
      console.error("Error updating account details:", error);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Company Name</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your Company Name"
        />
      </div>
      <div>
        <Label htmlFor="category">Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {companyCategories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="subcategory">Subcategory</Label>
        <Input
          id="subcategory"
          type="text"
          value={subcategory || ''}
          onChange={(e) => setSubcategory(e.target.value)}
          placeholder="Subcategory"
        />
      </div>
      <div>
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          value={address || ''}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Company Address"
        />
      </div>
      <Button type="submit" disabled={isUpdating}>
        {isUpdating ? "Updating..." : "Update Details"}
      </Button>
    </form>
  );
};

export default AccountDetailsForm;
