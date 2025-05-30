
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, ArrowLeft, Shield, Mail, Calendar, Building } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define more specific types for the data structure
interface UserWithDetails {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  profile: {
    full_name: string | null;
  } | null;
  global_roles: Array<{
    role: string;
  }>;
  account_memberships: Array<{
    role: string;
    account: {
      name: string;
    };
  }>;
}

const SuperAdminUsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Fetch all users with their details
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['superAdminUsers'],
    queryFn: async () => {
      // Update the query to properly handle the data structure
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          created_at,
          last_sign_in_at,
          profiles:profiles(full_name),
          global_roles:user_global_roles(role),
          account_memberships:account_memberships(
            role,
            account:accounts(name)
          )
        `);

      if (error) throw error;

      // Transform the data to match our interface
      return (data || []).map(user => ({
        id: user.id,
        email: user.email || '',
        created_at: user.created_at || '',
        last_sign_in_at: user.last_sign_in_at || null,
        profile: user.profiles || { full_name: null },
        global_roles: (user.global_roles as Array<{ role: string }>) || [],
        account_memberships: (user.account_memberships as Array<{
          role: string;
          account: { name: string };
        }>) || []
      })) as UserWithDetails[];
    },
  });

  // Mutation to update global roles
  const updateGlobalRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string | null }) => {
      if (role === null) {
        // Remove super admin role
        const { error } = await supabase
          .from('user_global_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'super_admin');
        
        if (error) throw error;
      } else {
        // Add super admin role - explicitly cast the role to the proper enum type
        const { error } = await supabase
          .from('user_global_roles')
          .upsert({
            user_id: userId,
            role: role as "super_admin" | "account_admin" | "account_user"
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      sonnerToast.success("User role updated successfully.");
      queryClient.invalidateQueries({ queryKey: ['superAdminUsers'] });
    },
    onError: (err: Error) => {
      sonnerToast.error(`Failed to update user role: ${err.message}`);
    },
  });

  const handleRoleChange = (userId: string, newRole: string) => {
    const roleToSet = newRole === 'none' ? null : newRole;
    updateGlobalRoleMutation.mutate({ userId, role: roleToSet });
  };

  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Loading users...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-center text-destructive">Error loading users: {error.message}</div>;
  }

  const userList = users || [];

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Users size={48} className="text-primary mr-4" />
          <div>
            <h1 className="text-3xl font-bold text-primary">User Management</h1>
            <p className="text-muted-foreground">Manage all users, roles, and account memberships.</p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link to="/super-admin">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Users</CardTitle>
          <CardDescription>
            {userList.length > 0 
              ? `${userList.length} user${userList.length === 1 ? '' : 's'} in the system.` 
              : "No users found in the system."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Global Role</TableHead>
                  <TableHead>Account Memberships</TableHead>
                  <TableHead>Last Sign In</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userList.map((user) => {
                  const hasGlobalRole = user.global_roles.length > 0;
                  const globalRole = hasGlobalRole ? user.global_roles[0].role : 'none';
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <Mail className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">
                            {user.profile?.full_name || 'No name set'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{user.email}</TableCell>
                      <TableCell>
                        <Select
                          value={globalRole}
                          onValueChange={(value) => handleRoleChange(user.id, value)}
                          disabled={updateGlobalRoleMutation.isPending}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Role</SelectItem>
                            <SelectItem value="super_admin">
                              <div className="flex items-center gap-2">
                                <Shield className="h-3 w-3" />
                                Super Admin
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.account_memberships.length > 0 ? (
                            user.account_memberships.map((membership, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                <Building className="h-3 w-3 mr-1" />
                                {membership.account.name} ({membership.role})
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">No memberships</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.last_sign_in_at ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {new Date(user.last_sign_in_at).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" disabled>
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No users found in the system.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminUsersPage;
