
import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';

const profileFormSchema = z.object({
  full_name: z.string().min(2, { message: "Full name must be at least 2 characters." }).max(100),
  email: z.string().email().optional(), // Email is read-only
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const ProfileDetailsForm: React.FC = () => {
  const { user, profile, updateUserProfile, loading: authLoading } = useAuth();
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
        full_name: '', // No profile yet, or profile.full_name is null
        email: user.email || '',
      });
    }
  }, [profile, user, form]);

  const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    setIsSubmitting(true);
    const success = await updateUserProfile({ full_name: data.full_name });
    if (success) {
      // Profile state in context is updated, form will re-sync via useEffect
    } else {
      // Error toast handled by updateUserProfile
    }
    setIsSubmitting(false);
  };

  if (authLoading && !profile) {
    return <p>Loading profile information...</p>;
  }
  
  if (!user) {
    return <p>Please log in to view your profile.</p>;
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
              <FormMessage /> {/* Should not show errors for readOnly field */}
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
