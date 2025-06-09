
import React from 'react';
import { Eye, Edit, Loader2, Trash2, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from '@/components/ui/badge';
import { SiteAssessment } from '@/types/siteAssessmentTypes';
import { getSignalStatus } from '@/lib/assessmentDisplayUtils';

interface SiteAssessmentTableRowProps {
  assessment: SiteAssessment;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onViewDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAttachmentsClick: () => void;
  isDeleting: boolean;
  isDeletingThis: boolean;
  documentCount: number;
  accountGoodThreshold?: number | null;
  accountBadThreshold?: number | null;
}

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

const getSignalScoreBadgeVariant = (score: number | null, accountGoodThreshold?: number | null, accountBadThreshold?: number | null) => {
  if (score === null || !accountGoodThreshold || !accountBadThreshold) {
    return "secondary";
  }
  
  // Convert score from percentage (0-100) to decimal (0-1) for comparison with thresholds
  const scoreDecimal = score / 100;
  
  // Apply threshold logic: Good >= goodThreshold, Bad <= badThreshold, Neutral = between
  if (scoreDecimal >= accountGoodThreshold) {
    return "success";
  }
  
  if (scoreDecimal <= accountBadThreshold) {
    return "destructive";
  }
  
  return "default"; // This will be yellow for the neutral/warning state
};

const SiteAssessmentTableRow: React.FC<SiteAssessmentTableRowProps> = ({
  assessment,
  isSelected,
  onSelect,
  onViewDetails,
  onEdit,
  onDelete,
  onAttachmentsClick,
  isDeleting,
  isDeletingThis,
  documentCount,
  accountGoodThreshold,
  accountBadThreshold,
}) => {
  // Ensure score is displayed as percentage (should be 0-100 from database)
  const displayScore = assessment.site_signal_score !== null && assessment.site_signal_score !== undefined
    ? Math.round(assessment.site_signal_score)
    : null;

  // Ensure completion is displayed as percentage (should be 0-100 from database)
  const displayCompletion = assessment.completion_percentage !== null && assessment.completion_percentage !== undefined
    ? Math.round(assessment.completion_percentage)
    : null;

  console.log('Table row display scores:', {
    assessmentId: assessment.id,
    rawScore: assessment.site_signal_score,
    displayScore,
    rawCompletion: assessment.completion_percentage,
    displayCompletion,
    accountGoodThreshold,
    accountBadThreshold
  });

  return (
    <TableRow 
      data-state={isSelected ? "selected" : undefined}
      className={isSelected ? "bg-muted/50" : ""}
    >
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          aria-label={`Select assessment ${assessment.assessment_name || assessment.id}`}
          disabled={isDeleting}
        />
      </TableCell>
      <TableCell className="font-medium">{assessment.assessment_name || 'N/A'}</TableCell>
      <TableCell>
        {assessment.address_line1 || ''}
        {assessment.address_line1 && assessment.city ? ', ' : ''}
        {assessment.city || ''}
      </TableCell>
      <TableCell className="text-center">
        <Badge variant={getSiteStatusColor(assessment.site_status)} className="text-sm">
          {assessment.site_status || 'Prospect'}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        {displayScore !== null ? (
          <Badge variant={getSignalScoreBadgeVariant(displayScore, accountGoodThreshold, accountBadThreshold)} className="text-sm">
            {displayScore}%
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">N/A</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        {displayCompletion !== null ? (
          <span>{displayCompletion}%</span>
        ) : (
          <span className="text-xs text-muted-foreground">N/A</span>
        )}
      </TableCell>
      <TableCell>{new Date(assessment.created_at).toLocaleDateString()}</TableCell>
      <TableCell className="text-right space-x-1">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={onViewDetails}
          disabled={!assessment.target_metric_set_id || isDeleting}
          title={!assessment.target_metric_set_id ? "Select a metric set to view details" : "View Details"}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={onEdit}
          title="Edit Assessment"
          disabled={isDeleting}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onAttachmentsClick}
          title="Attach Files"
          disabled={isDeleting}
          className="relative"
        >
          <Paperclip className="h-4 w-4" />
          {documentCount > 0 && (
            <Badge 
              variant="default" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {documentCount}
            </Badge>
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="text-destructive border-destructive hover:bg-destructive/90 hover:text-destructive-foreground"
          onClick={onDelete}
          title="Delete Assessment"
          disabled={isDeletingThis}
        >
          {isDeletingThis ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default SiteAssessmentTableRow;
