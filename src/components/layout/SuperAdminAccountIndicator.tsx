
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building, X } from 'lucide-react';
import { useSuperAdminContext } from '@/contexts/SuperAdminContext';
import { useAuth } from '@/contexts/AuthContext';

const SuperAdminAccountIndicator: React.FC = () => {
  const { activeAccount, stopImpersonation, isImpersonating } = useSuperAdminContext();
  const { isSuperAdmin } = useAuth();

  if (!isSuperAdmin || !isImpersonating || !activeAccount) {
    return null;
  }

  return (
    <div className="bg-orange-500 text-white px-4 py-2 text-sm flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Building className="h-4 w-4" />
        <span className="font-medium">Super Admin Mode:</span>
        <Badge variant="secondary" className="bg-white text-orange-500">
          {activeAccount.name}
        </Badge>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={stopImpersonation}
        className="text-white hover:bg-orange-600 h-auto p-1"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default SuperAdminAccountIndicator;
