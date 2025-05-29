
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type CBSAStatus = 'Active' | 'Pipeline' | 'Priority' | 'Hold' | 'Avoid';

interface CBSAStatusSelectorProps {
  value?: CBSAStatus;
  onValueChange: (value: CBSAStatus) => void;
  cbsaId: string;
}

const getStatusColor = (status?: CBSAStatus) => {
  switch (status) {
    case 'Active':
      return 'text-green-700 bg-green-50 border-green-200';
    case 'Pipeline':
      return 'text-blue-700 bg-blue-50 border-blue-200';
    case 'Priority':
      return 'text-orange-700 bg-orange-50 border-orange-200';
    case 'Hold':
      return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    case 'Avoid':
      return 'text-red-700 bg-red-50 border-red-200';
    default:
      return 'text-gray-700 bg-gray-50 border-gray-200';
  }
};

const CBSAStatusSelector: React.FC<CBSAStatusSelectorProps> = ({
  value,
  onValueChange,
  cbsaId
}) => {
  return (
    <Select value={value || ''} onValueChange={(val) => onValueChange(val as CBSAStatus)}>
      <SelectTrigger className={`w-full h-8 text-xs ${getStatusColor(value)}`}>
        <SelectValue placeholder="Set status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Active">Active</SelectItem>
        <SelectItem value="Pipeline">Pipeline</SelectItem>
        <SelectItem value="Priority">Priority</SelectItem>
        <SelectItem value="Hold">Hold</SelectItem>
        <SelectItem value="Avoid">Avoid</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default CBSAStatusSelector;
