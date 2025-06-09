
// Account type definitions
export interface Account {
  id: string;
  name: string;
  category?: string | null;
  subcategory?: string | null;
  address?: string | null;
  logo_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AccountMembership {
  id: string;
  account_id: string;
  user_id: string;
  role: 'account_admin' | 'account_user';
  created_at?: string;
}
