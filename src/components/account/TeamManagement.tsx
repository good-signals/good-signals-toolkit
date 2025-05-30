
import React, { useState, useEffect } from 'react';
import { Plus, Mail, Trash2, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Account } from '@/services/accountService';
import { AccountInvitation, sendInvitation, fetchAccountInvitations, cancelInvitation } from '@/services/invitationService';

interface TeamManagementProps {
  account: Account;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ account }) => {
  const [invitations, setInvitations] = useState<AccountInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'account_admin' | 'account_user'>('account_user');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadInvitations();
  }, [account.id]);

  const loadInvitations = async () => {
    setIsLoading(true);
    const data = await fetchAccountInvitations(account.id);
    setInvitations(data);
    setIsLoading(false);
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSending(true);
    const invitation = await sendInvitation(account.id, email, role);
    if (invitation) {
      setInvitations(prev => [invitation, ...prev]);
      setEmail('');
      setRole('account_user');
    }
    setIsSending(false);
  };

  const handleCancelInvitation = async (invitationId: string) => {
    const success = await cancelInvitation(invitationId);
    if (success) {
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'accepted':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Accepted</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Team Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Send Invitation Form */}
        <form onSubmit={handleSendInvitation} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(value: 'account_admin' | 'account_user') => setRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="account_user">Account User</SelectItem>
                  <SelectItem value="account_admin">Account Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={isSending} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                {isSending ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </div>
        </form>

        {/* Invitations List */}
        <div className="space-y-4">
          <h4 className="font-medium">Pending Invitations</h4>
          {isLoading ? (
            <p className="text-muted-foreground">Loading invitations...</p>
          ) : invitations.length === 0 ? (
            <p className="text-muted-foreground">No invitations sent yet.</p>
          ) : (
            <div className="space-y-2">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{invitation.email}</span>
                      {getStatusBadge(invitation.status)}
                      <Badge variant="outline">{invitation.role.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Invited {new Date(invitation.created_at).toLocaleDateString()}
                      {invitation.status === 'pending' && (
                        <span> • Expires {new Date(invitation.expires_at).toLocaleDateString()}</span>
                      )}
                    </p>
                  </div>
                  {invitation.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelInvitation(invitation.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamManagement;
