
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProfileDetailsForm from '@/components/settings/ProfileDetailsForm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const ProfileSettingsPage: React.FC = () => {
  const { user, authLoading } = useAuth();

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary">Profile & Settings</h1>
        <p className="text-muted-foreground">Manage your personal information and account settings.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your name and email address.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ProfileDetailsForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSettingsPage;
