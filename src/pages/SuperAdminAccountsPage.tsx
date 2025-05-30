
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, ArrowLeft, Users, Calendar, MapPin } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';

interface Account {
  id: string;
  name: string;
  category: string | null;
  subcategory: string | null;
  address: string | null;
  created_at: string;
  member_count: number;
  admin_count: number;
}

const SuperAdminAccountsPage: React.FC = () => {
  // Fetch all accounts with member counts
  const { data: accounts, isLoading, error } = useQuery({
    queryKey: ['superAdminAccounts'],
    queryFn: async () => {
      console.log('Fetching accounts for super admin...');
      
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          id,
          name,
          category,
          subcategory,
          address,
          created_at,
          account_memberships!inner(
            role
          )
        `);

      if (error) {
        console.error('Error fetching accounts:', error);
        throw error;
      }

      // Process the data to get member counts
      const accountsWithCounts = (data || []).map(account => {
        const memberships = account.account_memberships as Array<{ role: string }>;
        const memberCount = memberships.length;
        const adminCount = memberships.filter(m => m.role === 'account_admin').length;
        
        return {
          id: account.id,
          name: account.name,
          category: account.category,
          subcategory: account.subcategory,
          address: account.address,
          created_at: account.created_at,
          member_count: memberCount,
          admin_count: adminCount,
        } as Account;
      });

      console.log('Processed accounts:', accountsWithCounts);
      return accountsWithCounts;
    },
  });

  const handleAccessAccount = (accountId: string, accountName: string) => {
    // For now, we'll just show a toast. Later we'll implement the actual switching logic
    sonnerToast.info(`Account access feature coming soon! Selected: ${accountName}`);
    console.log('Accessing account:', accountId, accountName);
  };

  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Loading accounts...</div>;
  }

  if (error) {
    console.error('Query error:', error);
    return <div className="container mx-auto p-4 text-center text-destructive">Error loading accounts: {error.message}</div>;
  }

  const accountList = accounts || [];

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Building size={48} className="text-primary mr-4" />
          <div>
            <h1 className="text-3xl font-bold text-primary">Account Management</h1>
            <p className="text-muted-foreground">View and access all accounts in the system.</p>
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
          <CardTitle>System Accounts</CardTitle>
          <CardDescription>
            {accountList.length > 0 
              ? `${accountList.length} account${accountList.length === 1 ? '' : 's'} in the system.` 
              : "No accounts found in the system."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accountList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Admins</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountList.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <Building className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium">{account.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {account.category && (
                          <Badge variant="secondary" className="text-xs w-fit">
                            {account.category}
                          </Badge>
                        )}
                        {account.subcategory && (
                          <span className="text-xs text-muted-foreground">
                            {account.subcategory}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span className="text-sm">{account.member_count}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-blue-500" />
                        <span className="text-sm">{account.admin_count}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {account.address ? (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-32" title={account.address}>
                            {account.address}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No address</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {new Date(account.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAccessAccount(account.id, account.name)}
                      >
                        Access Account
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No accounts found in the system.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminAccountsPage;
