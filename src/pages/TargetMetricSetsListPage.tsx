
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getTargetMetricSets, deleteTargetMetricSet, TargetMetricSet } from '@/services/targetMetricsService';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { PlusCircle, Edit3, Trash2, ListChecks } from 'lucide-react';
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

const TargetMetricSetsListPage: React.FC = () => {
  const { user, authLoading } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: metricSets, isLoading, error } = useQuery<TargetMetricSet[], Error>({
    queryKey: ['targetMetricSets', user?.id],
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return getTargetMetricSets(user.id);
    },
    enabled: !!user && !authLoading,
  });

  const deleteMutation = useMutation({
    mutationFn: (metricSetId: string) => {
      if (!user?.id) throw new Error("User not authenticated.");
      return deleteTargetMetricSet(metricSetId, user.id);
    },
    onSuccess: () => {
      sonnerToast.success("Metric set deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ['targetMetricSets', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['hasUserSetAnyMetrics', user?.id] }); // If this key is used
    },
    onError: (err: Error) => {
      sonnerToast.error(`Failed to delete metric set: ${err.message}`);
    },
  });

  const handleDelete = (metricSetId: string) => {
    deleteMutation.mutate(metricSetId);
  };

  if (isLoading || authLoading) {
    return <div className="container mx-auto p-4 text-center">Loading metric sets...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-center text-destructive">Error loading metric sets: {error.message}</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <ListChecks size={48} className="text-primary mr-4" />
          <div>
            <h1 className="text-3xl font-bold text-primary">Your Target Metric Sets</h1>
            <p className="text-muted-foreground">Manage your custom sets of target metrics.</p>
          </div>
        </div>
        <Button asChild>
          <Link to="/target-metrics-builder">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Set
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Metric Sets</CardTitle>
          <CardDescription>
            {metricSets && metricSets.length > 0 
              ? "Here are all your saved target metric sets." 
              : "You haven't created any target metric sets yet."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metricSets && metricSets.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Set Name</TableHead>
                  <TableHead>Date Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metricSets.map((set) => (
                  <TableRow key={set.id}>
                    <TableCell className="font-medium">{set.name}</TableCell>
                    <TableCell>{new Date(set.created_at!).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/target-metrics-builder/${set.id}`)}>
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
                              This action cannot be undone. This will permanently delete the metric set
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
              <p className="text-muted-foreground mb-4">No metric sets found. Get started by creating one!</p>
              <Button asChild>
                <Link to="/target-metrics-builder">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Set
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TargetMetricSetsListPage;
