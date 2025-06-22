
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProfileDetailsForm from '@/components/settings/ProfileDetailsForm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Briefcase } from 'lucide-react';

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
        
        <Card>
          <CardHeader>
            <CardTitle>Account Management</CardTitle>
            <CardDescription>Manage your company settings, logo, and team members.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Access settings related to your company account, including company details and logo.
            </p>
             <Link to="/account-management">
              <Button variant="outline">
                <Briefcase className="mr-2 h-4 w-4" />
                Go to Account Management
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSettingsPage;
