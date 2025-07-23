
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type CBSAStatus = 'Active' | 'Priority' | 'Avoid' | 'Blocked';

interface CBSAStatusSelectorProps {
  value?: CBSAStatus;
  onValueChange: (value: CBSAStatus) => void;
  cbsaId: string;
}

const getStatusColor = (status?: CBSAStatus) => {
  switch (status) {
    case 'Active':
      return 'text-green-700 bg-green-50 border-green-200';
    case 'Priority':
      return 'text-orange-700 bg-orange-50 border-orange-200';
    case 'Avoid':
      return 'text-red-700 bg-red-50 border-red-200';
    case 'Blocked':
      return 'text-gray-700 bg-gray-50 border-gray-200';
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
        <SelectItem value="Priority">Priority</SelectItem>
        <SelectItem value="Avoid">Avoid</SelectItem>
        <SelectItem value="Blocked">Blocked</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default CBSAStatusSelector;
