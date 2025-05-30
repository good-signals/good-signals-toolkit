
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AccountInvitation {
  id: string;
  account_id: string;
  email: string;
  invited_by: string;
  role: 'account_admin' | 'account_user';
  status: 'pending' | 'accepted' | 'expired';
  invitation_token: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export const sendInvitation = async (
  accountId: string,
  email: string,
  role: 'account_admin' | 'account_user' = 'account_user'
): Promise<AccountInvitation | null> => {
  try {
    const { data, error } = await supabase
      .from('account_invitations')
      .insert({
        account_id: accountId,
        email: email.toLowerCase().trim(),
        role,
        invited_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending invitation:', error);
      if (error.code === '23505') {
        toast.error('User has already been invited to this account');
      } else {
        toast.error(`Failed to send invitation: ${error.message}`);
      }
      return null;
    }

    toast.success(`Invitation sent to ${email}`);
    return data;
  } catch (error: any) {
    console.error('Unexpected error sending invitation:', error);
    toast.error('An unexpected error occurred while sending invitation');
    return null;
  }
};

export const fetchAccountInvitations = async (accountId: string): Promise<AccountInvitation[]> => {
  try {
    const { data, error } = await supabase
      .from('account_invitations')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      toast.error('Failed to load invitations');
      return [];
    }

    return data || [];
  } catch (error: any) {
    console.error('Unexpected error fetching invitations:', error);
    return [];
  }
};

export const cancelInvitation = async (invitationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('account_invitations')
      .delete()
      .eq('id', invitationId);

    if (error) {
      console.error('Error canceling invitation:', error);
      toast.error('Failed to cancel invitation');
      return false;
    }

    toast.success('Invitation canceled');
    return true;
  } catch (error: any) {
    console.error('Unexpected error canceling invitation:', error);
    toast.error('An unexpected error occurred');
    return false;
  }
};

export const acceptInvitation = async (invitationToken: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('accept_invitation', {
      invitation_token: invitationToken
    });

    if (error) {
      console.error('Error accepting invitation:', error);
      toast.error('Failed to accept invitation');
      return false;
    }

    if (data?.success) {
      toast.success(data.message || 'Successfully joined account!');
      return true;
    } else {
      toast.error(data?.error || 'Failed to accept invitation');
      return false;
    }
  } catch (error: any) {
    console.error('Unexpected error accepting invitation:', error);
    toast.error('An unexpected error occurred');
    return false;
  }
};
