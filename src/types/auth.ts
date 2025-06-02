
import { Session, User } from '@supabase/supabase-js';

// Define the shape of the profile data
export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
}

// Define the shape of the context
export interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  authLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateContextUserProfile: (updates: { full_name?: string; avatar_url?: string }) => Promise<boolean>;
  uploadAvatarAndUpdateProfile: (file: File) => Promise<boolean>;
}
