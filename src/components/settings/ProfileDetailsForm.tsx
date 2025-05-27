import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const profileFormSchema = z.object({
  full_name: z.string().min(2, { message: "Full name must be at least 2 characters." }).max(100),
  email: z.string().email().optional(), // Email is read-only
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const ProfileDetailsForm: React.FC = () => {
  const { user, profile, updateContextUserProfile, authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      full_name: '',
      email: '',
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        full_name: profile.full_name || '',
        email: user?.email || '',
      });
    } else if (user) {
        form.reset({
        full_name: '', 
        email: user.email || '',
      });
    }
  }, [profile, user, form]);

  const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    setIsSubmitting(true);
    // Make sure full_name is part of data, even if unchanged, to satisfy service/db update
    const nameToUpdate = data.full_name === (profile?.full_name || '') ? profile?.full_name : data.full_name;

    if (nameToUpdate !== undefined && nameToUpdate !== null) {
         await updateContextUserProfile({ full_name: nameToUpdate });
    } else if (data.full_name) { // Fallback if profile.full_name was null
         await updateContextUserProfile({ full_name: data.full_name });
    }
    // Success/error toasts are handled by updateContextUserProfile
    setIsSubmitting(false);
  };

  if (authLoading && !profile && !user) {
    return <p>Loading user session...</p>;
  }
  
  if (!user) {
    return <p>Please log in to view your profile.</p>;
  }
  
  if (authLoading && !profile && user) {
    return <p>Loading profile information...</p>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Your full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="your@email.com" {...field} readOnly className="bg-muted/50 cursor-not-allowed" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={isSubmitting || authLoading} className="w-full sm:w-auto">
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </Form>
  );
};

export default ProfileDetailsForm;
