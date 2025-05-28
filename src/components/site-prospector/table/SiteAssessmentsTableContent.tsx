
import React from 'react';
import { Table, TableBody } from "@/components/ui/table";
import { SiteAssessment } from '@/types/siteAssessmentTypes';
import SiteAssessmentsTableHeader from './SiteAssessmentsTableHeader';
import SiteAssessmentTableRow from './SiteAssessmentTableRow';

type SortableKeys = 'assessment_name' | 'address_line1' | 'created_at' | 'site_signal_score' | 'completion_percentage' | 'site_status';

interface SiteAssessmentsTableContentProps {
  assessments: SiteAssessment[];
  selectedAssessmentIds: string[];
  sortConfig: { key: SortableKeys | null; direction: 'asc' | 'desc' };
  onSort: (key: SortableKeys) => void;
  onSelectAll: (checked: boolean | 'indeterminate') => void;
  onSelectRow: (assessmentId: string, checked: boolean) => void;
  onViewDetails: (assessment: SiteAssessment) => void;
  onEdit: (assessment: SiteAssessment) => void;
  onDelete: (assessment: SiteAssessment) => void;
  onAttachmentsClick: (assessment: SiteAssessment) => void;
  isDeleting: boolean;
  assessmentToDelete: SiteAssessment | null;
  documentCounts: Record<string, number>;
}

const SiteAssessmentsTableContent: React.FC<SiteAssessmentsTableContentProps> = ({
  assessments,
  selectedAssessmentIds,
  sortConfig,
  onSort,
  onSelectAll,
  onSelectRow,
  onViewDetails,
  onEdit,
  onDelete,
  onAttachmentsClick,
  isDeleting,
  assessmentToDelete,
  documentCounts,
}) => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <SiteAssessmentsTableHeader
          sortConfig={sortConfig}
          onSort={onSort}
          selectedCount={selectedAssessmentIds.length}
          totalCount={assessments.length}
          onSelectAll={onSelectAll}
          isDeleting={isDeleting}
        />
        <TableBody>
          {assessments.map((assessment) => (
            <SiteAssessmentTableRow
              key={assessment.id}
              assessment={assessment}
              isSelected={selectedAssessmentIds.includes(assessment.id)}
              onSelect={(checked) => onSelectRow(assessment.id, checked)}
              onViewDetails={() => onViewDetails(assessment)}
              onEdit={() => onEdit(assessment)}
              onDelete={() => onDelete(assessment)}
              onAttachmentsClick={() => onAttachmentsClick(assessment)}
              isDeleting={isDeleting}
              isDeletingThis={isDeleting && assessmentToDelete?.id === assessment.id}
              documentCount={documentCounts[assessment.id] || 0}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default SiteAssessmentsTableContent;
