
import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // For address
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Account, updateAccountDetailsService } from '@/services/accountService';

const accountFormSchema = z.object({
  name: z.string().min(2, { message: "Account name must be at least 2 characters." }).max(100),
  category: z.string().max(100).optional().nullable(),
  subcategory: z.string().max(100).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

interface AccountDetailsFormProps {
  account: Account;
  onAccountUpdate: (updatedAccount: Account) => void;
}

const AccountDetailsForm: React.FC<AccountDetailsFormProps> = ({ account, onAccountUpdate }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: account.name || '',
      category: account.category || '',
      subcategory: account.subcategory || '',
      address: account.address || '',
    },
  });

  useEffect(() => {
    form.reset({
      name: account.name || '',
      category: account.category || '',
      subcategory: account.subcategory || '',
      address: account.address || '',
    });
  }, [account, form]);

  const onSubmit: SubmitHandler<AccountFormValues> = async (data) => {
    setIsSubmitting(true);
    const updatedAccount = await updateAccountDetailsService(account.id, {
      name: data.name,
      category: data.category,
      subcategory: data.subcategory,
      address: data.address,
    });
    
    if (updatedAccount) {
      onAccountUpdate(updatedAccount);
      // Toast handled by service
    }
    setIsSubmitting(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Name</FormLabel>
              <FormControl>
                <Input placeholder="Your company name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Technology, Healthcare" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subcategory"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subcategory</FormLabel>
              <FormControl>
                <Input placeholder="e.g., SaaS, Medical Devices" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea placeholder="Company address" {...field} value={field.value ?? ''} className="min-h-[80px]" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? 'Saving...' : 'Save Account Changes'}
        </Button>
      </form>
    </Form>
  );
};

export default AccountDetailsForm;
