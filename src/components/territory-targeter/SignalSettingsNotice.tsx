
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Account } from '@/services/accountService';

interface SignalSettingsNoticeProps {
  currentAccount: Account | null;
  accountGoodThreshold: number;
  accountBadThreshold: number;
}

const SignalSettingsNotice: React.FC<SignalSettingsNoticeProps> = ({
  currentAccount,
  accountGoodThreshold,
  accountBadThreshold
}) => {
  if (!currentAccount) return null;

  return (
    <div className="mb-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Using account signal settings: Good ≥ {Math.round(accountGoodThreshold * 100)}%, Bad ≤ {Math.round(accountBadThreshold * 100)}%
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default SignalSettingsNotice;
