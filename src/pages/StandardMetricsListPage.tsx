
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Plus, Edit3, Trash2, Shield } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStandardMetricSets, deleteStandardMetricSet } from '@/services/standardMetricsService';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { toast as sonnerToast } from 'sonner';
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

const StandardMetricsListPage: React.FC = () => {
  const { isSuperAdmin } = useSuperAdmin();
  const queryClient = useQueryClient();

  const { data: standardSets, isLoading } = useQuery({
    queryKey: ['standardMetricSets'],
    queryFn: getStandardMetricSets,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStandardMetricSet,
    onSuccess: () => {
      sonnerToast.success("Standard metric set deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ['standardMetricSets'] });
    },
    onError: (error) => {
      sonnerToast.error(`Failed to delete standard metric set: ${error.message}`);
    },
  });

  if (!isSuperAdmin) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <div className="text-destructive">
          <Shield className="h-12 w-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p>You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="container mx-auto py-12 px-4 text-center">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <BarChart size={48} className="text-primary mr-4" />
          <div>
            <h1 className="text-3xl font-bold text-primary">Standard Target Metrics</h1>
            <p className="text-muted-foreground">
              Manage standard metric templates that can be used by all accounts.
            </p>
          </div>
        </div>
        <Button asChild>
          <Link to="/super-admin/standard-metrics/builder">
            <Plus className="mr-2 h-4 w-4" />
            Create Standard Set
          </Link>
        </Button>
      </div>

      {standardSets && standardSets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Standard Metric Sets</h3>
            <p className="text-muted-foreground mb-4">
              Create your first standard metric set to provide templates for all accounts.
            </p>
            <Button asChild>
              <Link to="/super-admin/standard-metrics/builder">
                <Plus className="mr-2 h-4 w-4" />
                Create Standard Set
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {standardSets?.map((set) => (
            <Card key={set.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {set.name}
                      <Badge variant="secondary">Standard</Badge>
                    </CardTitle>
                    {set.description && (
                      <CardDescription>{set.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/super-admin/standard-metrics/builder/${set.id}`}>
                        <Edit3 className="h-4 w-4 mr-1" />
                        Edit
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Standard Metric Set</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{set.name}"? This action cannot be undone.
                            Accounts that have already imported this set will keep their copies.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(set.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Created: {new Date(set.created_at).toLocaleDateString()}
                  {set.updated_at !== set.created_at && (
                    <span className="ml-4">
                      Updated: {new Date(set.updated_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StandardMetricsListPage;
