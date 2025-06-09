
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Plus, Search, Filter, Download, MoreHorizontal, Edit, Trash2, FileText, Target, MapPin, Calendar, Building, ExternalLink } from 'lucide-react';
import { useSiteAssessmentOperations } from '@/hooks/useSiteAssessmentOperations';
import { useTargetMetricsDraft } from '@/hooks/useTargetMetricsDraft';
import { SiteAssessment } from '@/types/siteAssessmentTypes';
import SiteAssessmentsTableContent from './table/SiteAssessmentsTableContent';
import ExportButton from '@/components/export/ExportButton';
import { Account } from '@/services/account';

interface SiteAssessmentsTableProps {
  accountId: string;
}

const SiteAssessmentsTable: React.FC<SiteAssessmentsTableProps> = ({ accountId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<SiteAssessment | null>(null);
  const { user } = useAuth();
  const {
    assessments,
    isLoadingAssessments: loading,
    deleteMutation,
  } = useSiteAssessmentOperations('idle');
  const { loadDraft } = useTargetMetricsDraft();

  const filteredAssessments = assessments.filter(assessment => {
    const searchMatch = assessment.assessment_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        assessment.address_line1?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        assessment.city?.toLowerCase().includes(searchQuery.toLowerCase());
    const statusMatch = filterStatus ? assessment.site_status === filterStatus : true;
    return searchMatch && statusMatch;
  });

  const handleCreateAssessment = () => {
    loadDraft();
    setIsDialogOpen(true);
  };

  const handleEditAssessment = (assessment: SiteAssessment) => {
    setSelectedAssessment(assessment);
    loadDraft();
    setIsDialogOpen(true);
  };

  const handleDeleteAssessment = async (assessment: SiteAssessment) => {
    try {
      deleteMutation.mutate([assessment.id]);
      toast.success('Site assessment deleted successfully.');
    } catch (error) {
      console.error('Error deleting site assessment:', error);
      toast.error('Failed to delete site assessment.');
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedAssessment(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Site Assessments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3 items-center">
          <Input
            type="text"
            placeholder="Search assessments..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="md:col-span-1"
          />
          <Select onValueChange={setFilterStatus} defaultValue={filterStatus}>
            <SelectTrigger className="w-full md:col-span-1">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex justify-end md:col-span-1">
            <ExportButton exportData={assessments} filename="site-assessments" />
            <Button onClick={handleCreateAssessment}>
              <Plus className="mr-2 h-4 w-4" />
              Create Assessment
            </Button>
          </div>
        </div>

        <SiteAssessmentsTableContent
          assessments={filteredAssessments}
          loading={loading}
          onEdit={handleEditAssessment}
          onDelete={handleDeleteAssessment}
        />
      </CardContent>
    </Card>
  );
};

export default SiteAssessmentsTable;
