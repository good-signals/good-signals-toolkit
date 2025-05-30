import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, BarChart, TrendingUp, Settings, HelpCircle, Building } from 'lucide-react';

const SuperAdminDashboard: React.FC = () => {

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center mb-8">
        <Shield size={48} className="text-primary mr-4" />
        <div>
          <h1 className="text-3xl font-bold text-primary">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">System administration and management tools.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Account Management Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="mr-2 h-5 w-5" />
              Account Management
            </CardTitle>
            <CardDescription>
              View and manage all accounts in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Access account details, switch between accounts, and manage account-specific settings.
            </p>
            <Button asChild className="w-full">
              <Link to="/super-admin/accounts">
                <Building className="mr-2 h-4 w-4" />
                Manage Accounts
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* User Management Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              Manage users, roles, and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View all users, assign global roles, and manage user permissions across the platform.
            </p>
            <Button asChild className="w-full">
              <Link to="/super-admin/users">
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Standard Metrics Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart className="mr-2 h-5 w-5" />
              Standard Metrics
            </CardTitle>
            <CardDescription>
              Configure global metric templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Create and manage standard metric sets that can be used across all accounts.
            </p>
            <Button asChild className="w-full">
              <Link to="/super-admin/standard-metrics">
                <BarChart className="mr-2 h-4 w-4" />
                Manage Metrics
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* System Analytics Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              System Analytics
            </CardTitle>
            <CardDescription>
              Platform usage and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Monitor system health, user activity, and platform performance metrics.
            </p>
            <Button variant="outline" className="w-full" disabled>
              <TrendingUp className="mr-2 h-4 w-4" />
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        {/* System Settings Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              System Settings
            </CardTitle>
            <CardDescription>
              Global platform configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Configure global settings, feature flags, and system-wide preferences.
            </p>
            <Button variant="outline" className="w-full" disabled>
              <Settings className="mr-2 h-4 w-4" />
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        {/* Support Tools Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <HelpCircle className="mr-2 h-5 w-5" />
              Support Tools
            </CardTitle>
            <CardDescription>
              Customer support and troubleshooting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Access tools for customer support, debugging, and system troubleshooting.
            </p>
            <Button variant="outline" className="w-full" disabled>
              <HelpCircle className="mr-2 h-4 w-4" />
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
