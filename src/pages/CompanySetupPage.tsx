
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import CompanySetupForm from '@/components/auth/CompanySetupForm';
import { toast } from 'sonner';

const CompanySetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        // User is authenticated, use their ID
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
