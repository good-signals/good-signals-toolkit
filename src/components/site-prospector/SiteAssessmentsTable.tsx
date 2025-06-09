import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SiteAssessmentsTableHeader from './table/SiteAssessmentsTableHeader';
import SiteAssessmentsTableContent from './table/SiteAssessmentsTableContent';
import { SiteAssessment } from '@/types/siteAssessmentTypes';
import { Search, FileText, Plus } from 'lucide-react';

// Use the same SortableKeys type as the table content component
type SortableKeys = 'assessment_name' | 'address_line1' | 'created_at' | 'site_signal_score' | 'completion_percentage' | 'site_status';

interface SiteAssessmentsTableProps {
  assessments: SiteAssessment[];
  isLoading: boolean;
  errorLoading: Error | null;
  onViewDetails: (assessment: SiteAssessment) => void;
  onEdit: (assessment: SiteAssessment) => void;
  onDeleteCommit: (idsToDelete: string[]) => void;
  isDeleting: boolean;
  forceClearSelectionsKey: number;
}

const SiteAssessmentsTable: React.FC<SiteAssessmentsTableProps> = ({
  assessments,
  isLoading,
  errorLoading,
  onViewDetails,
  onEdit,
  onDeleteCommit,
  isDeleting,
  forceClearSelectionsKey,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'asc' | 'desc' }>({
    key: 'created_at',
    direction: 'desc'
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleEdit = (assessment: SiteAssessment) => {
    onEdit(assessment);
  };

  const handleViewDetails = (assessment: SiteAssessment) => {
    onViewDetails(assessment);
  };

  React.useEffect(() => {
    setSelectedIds([]);
  }, [forceClearSelectionsKey]);

  const filteredAndSortedAssessments = useMemo(() => {
    let filtered = assessments.filter(assessment =>
      assessment.assessment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assessment.address_line1.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assessment.city.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [assessments, searchTerm, sortConfig]);

  const handleSort = (key: SortableKeys) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedIds(filteredAndSortedAssessments.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length > 0) {
      onDeleteCommit(selectedIds);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">Loading assessments...</div>
        </CardContent>
      </Card>
    );
  }

  if (errorLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-destructive">Error loading assessments: {errorLoading.message}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Site Pipeline
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {assessments.length} assessment{assessments.length !== 1 ? 's' : ''} total
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {selectedIds.length > 0 && (
              <Button 
                variant="destructive" 
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                size="sm"
              >
                Delete Selected ({selectedIds.length})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assessments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="rounded-md border">
          <SiteAssessmentsTableContent
            assessments={filteredAndSortedAssessments}
            selectedAssessmentIds={selectedIds}
            sortConfig={sortConfig}
            onSort={handleSort}
            onSelectAll={handleSelectAll}
            onSelectRow={handleSelectRow}
            onViewDetails={handleViewDetails}
            onEdit={handleEdit}
            onDelete={async (assessment: SiteAssessment) => {
              onDeleteCommit([assessment.id]);
            }}
            onAttachmentsClick={(assessment: SiteAssessment) => {
              // Handle attachments click
              console.log('Attachments clicked for:', assessment.id);
            }}
            isDeleting={isDeleting}
            assessmentToDelete={null}
            documentCounts={{}}
            accountGoodThreshold={null}
            accountBadThreshold={null}
          />
        </div>

        {filteredAndSortedAssessments.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              {searchTerm ? 'No assessments match your search' : 'No assessments yet'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms' 
                : 'Get started by creating your first site assessment'
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SiteAssessmentsTable;
