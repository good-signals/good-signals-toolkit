
import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const siteStatusOptions = [
  'Prospect',
  'LOI', 
  'Lease',
  'Development',
  'Open',
  'Closed'
] as const;

const getSiteStatusColor = (status: string | null | undefined): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'Prospect': return 'outline';
    case 'LOI': return 'secondary';
    case 'Lease': return 'default';
    case 'Development': return 'secondary';
    case 'Open': return 'default';
    case 'Closed': return 'destructive';
    default: return 'outline';
  }
};

interface SiteStatusSelectorProps {
  value: string | null | undefined;
  onValueChange: (value: string) => void;
  label?: string;
  showBadge?: boolean;
}

const SiteStatusSelector: React.FC<SiteStatusSelectorProps> = ({ 
  value, 
  onValueChange, 
  label = "Site Status",
  showBadge = false 
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label>{label}</Label>
        {showBadge && value && (
          <Badge variant={getSiteStatusColor(value)} className="text-sm">
            {value}
          </Badge>
        )}
      </div>
      <Select value={value || 'Prospect'} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select site status" />
        </SelectTrigger>
        <SelectContent>
          {siteStatusOptions.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default SiteStatusSelector;
