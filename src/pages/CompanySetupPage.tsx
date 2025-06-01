
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import CompanySetupForm from '@/components/auth/CompanySetupForm';
import { toast } from 'sonner';

const CompanySetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, authLoading } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        // Check if user has confirmed their email
        if (!user.email_confirmed_at) {
          toast.error('Please confirm your email address first.');
          navigate('/auth');
          return;
        }
        // User is authenticated and email is confirmed
        setUserId(user.id);
      } else {
        // User not authenticated, redirect to auth
        toast.error('Please sign up or sign in first.');
        navigate('/auth');
      }
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading company setup...</p>
      </div>
    );
  }

  return <CompanySetupForm userId={userId} />;
};

export default CompanySetupPage;
