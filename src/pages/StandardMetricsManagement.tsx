
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getStandardTargetMetricSets, deleteStandardTargetMetricSet } from '@/services/standardMetricsService';
import { StandardTargetMetricSet } from '@/types/standardMetrics';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit3, Trash2, Target, ArrowLeft } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const StandardMetricsManagement: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: standardSets, isLoading, error } = useQuery<StandardTargetMetricSet[], Error>({
    queryKey: ['standardTargetMetricSets'],
    queryFn: getStandardTargetMetricSets,
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStandardTargetMetricSet,
    onSuccess: () => {
      sonnerToast.success("Standard metric set deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ['standardTargetMetricSets'] });
    },
    onError: (err: Error) => {
      sonnerToast.error(`Failed to delete standard metric set: ${err.message}`);
    },
  });

  const handleDelete = (setId: string) => {
    deleteMutation.mutate(setId);
  };

  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Loading standard metric sets...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-center text-destructive">Error loading standard metric sets: {error.message}</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Target size={48} className="text-primary mr-4" />
          <div>
            <h1 className="text-3xl font-bold text-primary">Standard Target Metrics</h1>
            <p className="text-muted-foreground">Manage platform-wide metric templates for new users.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/super-admin">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Link>
          </Button>
          <Button asChild>
            <Link to="/super-admin/standard-metrics/builder">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Standard Set
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Standard Metric Sets</CardTitle>
          <CardDescription>
            {standardSets && standardSets.length > 0 
              ? "Platform-wide metric templates that users can clone when creating their target metrics." 
              : "No standard metric sets have been created yet."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {standardSets && standardSets.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Set Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standardSets.map((set) => (
                  <TableRow key={set.id}>
                    <TableCell className="font-medium">{set.name}</TableCell>
                    <TableCell>{set.description || '-'}</TableCell>
                    <TableCell>{new Date(set.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/super-admin/standard-metrics/builder/${set.id}`)}>
                        <Edit3 className="mr-1 h-3 w-3" /> Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" disabled={deleteMutation.isPending}>
                            <Trash2 className="mr-1 h-3 w-3" /> Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the standard metric set
                              "{set.name}" and all its associated metrics.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(set.id)}>
                              Yes, delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No standard metric sets found. Create the first one!</p>
              <Button asChild>
                <Link to="/super-admin/standard-metrics/builder">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create Standard Set
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StandardMetricsManagement;
