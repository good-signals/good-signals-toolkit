
import React from 'react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Briefcase, Building } from 'lucide-react';
import UserAvatar from '@/components/auth/UserAvatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Account } from '@/services/accountService';

interface CompanyLogoDisplayProps {
  displayAccount: Account | null;
  isLoadingAccount: boolean;
}

const CompanyLogoDisplay: React.FC<CompanyLogoDisplayProps> = ({ 
  displayAccount, 
  isLoadingAccount 
}) => {
  return (
    <>
      <Separator />
      <div>
        <h3 className="text-lg font-medium mb-2">Company Logo</h3>
        {isLoadingAccount && !displayAccount ? (
          <div className="flex items-center space-x-4">
            <Skeleton className="h-20 w-20 rounded-full border-2 border-muted" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ) : displayAccount?.logo_url ? (
          <div className="flex items-center space-x-4">
            <UserAvatar 
              avatarUrl={displayAccount.logo_url} 
              fullName={displayAccount.name} 
              size={20}
              className="border-2 border-muted"
            />
            <div>
              <p className="text-sm font-medium">{displayAccount.name}</p>
              <p className="text-xs text-muted-foreground">This is your primary company logo.</p>
              <p className="text-xs text-muted-foreground mt-1">To change the logo, go to Account Management.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-3 p-4 border border-dashed rounded-md bg-muted/50">
            <Building className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">No company logo has been set.</p>
              <p className="text-xs text-muted-foreground">You can upload one in Account Management.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CompanyLogoDisplay;
