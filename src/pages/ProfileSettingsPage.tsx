
import React from 'react';
import ProfileDetailsForm from '@/components/settings/ProfileDetailsForm';
import AvatarUpload from '@/components/settings/AvatarUpload'; // Keep this for the next step
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const ProfileSettingsPage: React.FC = () => {
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
            <CardDescription>Update your name, email address, and profile picture.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ProfileDetailsForm />
            <Separator />
            <div>
              <h3 className="text-lg font-medium mb-2">Profile Picture</h3>
              <AvatarUpload />
            </div>
          </CardContent>
        </Card>
        
        {/* Future sections for Account Management, Security, etc. can be added here */}
        {/* 
        <Card>
          <CardHeader>
            <CardTitle>Account Management</CardTitle>
            <CardDescription>Manage your company settings and team members.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Company logo upload, user management, and account deletion will be here.</p>
          </CardContent>
        </Card>
        */}
      </div>
    </div>
  );
};

export default ProfileSettingsPage;
