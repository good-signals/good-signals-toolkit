
import React from 'react';
import ProfileDetailsForm from '@/components/settings/ProfileDetailsForm';
// import AvatarUpload from '@/components/settings/AvatarUpload'; // For later
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const ProfileSettingsPage: React.FC = () => {
  return (
    <div className="py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary">Profile & Settings</h1>
        <p className="text-muted-foreground">Manage your personal information and account settings.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-1"> {/* Might expand to more columns later */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your name and view your email address. Avatar uploads coming soon!</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileDetailsForm />
          </CardContent>
        </Card>

        {/* 
        <Card>
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
            <CardDescription>Change your avatar.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Avatar upload functionality will be here.</p>
            {/* <AvatarUpload /> будущем* /}
          </CardContent>
        </Card>
        */}

        {/* Future sections for Account Management, etc. */}
      </div>
    </div>
  );
};

export default ProfileSettingsPage;
