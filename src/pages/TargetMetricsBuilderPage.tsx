import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/components/ui/use-toast"
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createCustomMetric,
  getCustomMetrics,
  updateCustomMetric,
  deleteCustomMetric,
} from '@/services/targetMetricsService';
import { Account } from '@/services/account';
import { useAuth } from '@/contexts/AuthContext';
import { getAccountForUser } from '@/services/targetMetrics/accountHelpers';

interface CustomMetric {
  id: string;
  name: string;
  category: string;
  higher_is_better: boolean;
  units?: string;
  description?: string;
  default_target_value?: number;
}

interface CreateCustomMetricFormData {
  name: string;
  category: string;
  higher_is_better: boolean;
  units?: string;
  description?: string;
  default_target_value?: number;
}

const TargetMetricsBuilderPage = () => {
  const [isAddingMetric, setIsAddingMetric] = useState(false);
  const [editingMetricId, setEditingMetricId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<CustomMetric>>({});
  const [newMetricFormData, setNewMetricFormData] = useState<CreateCustomMetricFormData>({
    name: '',
    category: '',
    higher_is_better: true,
  });
  const [account, setAccount] = useState<Account | null>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: customMetrics,
    isLoading,
    error,
  } = useQuery<CustomMetric[]>(['customMetrics', account?.id], () => getCustomMetrics(account?.id), {
    enabled: !!account?.id,
  });

  const createMutation = useMutation(
    (metricData: CreateCustomMetricFormData) => createCustomMetric(account!.id, metricData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['customMetrics', account?.id]);
        setIsAddingMetric(false);
        setNewMetricFormData({ name: '', category: '', higher_is_better: true });
        toast({
          title: "Success",
          description: "Custom metric created successfully.",
        });
      },
      onError: (err: any) => {
        toast({
          title: "Error",
          description: `Failed to create custom metric: ${err?.message || 'Unknown error'}`,
          variant: "destructive",
        });
      },
    }
  );

  const updateMutation = useMutation(
    ({ metricId, metricData }: { metricId: string; metricData: Partial<CustomMetric> }) =>
      updateCustomMetric(account!.id, metricId, metricData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['customMetrics', account?.id]);
        setEditingMetricId(null);
        setEditFormData({});
        toast({
          title: "Success",
          description: "Custom metric updated successfully.",
        });
      },
      onError: (err: any) => {
        toast({
          title: "Error",
          description: `Failed to update custom metric: ${err?.message || 'Unknown error'}`,
          variant: "destructive",
        });
      },
    }
  );

  const deleteMutation = useMutation(
    (metricId: string) => deleteCustomMetric(account!.id, metricId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['customMetrics', account?.id]);
        toast({
          title: "Success",
          description: "Custom metric deleted successfully.",
        });
      },
      onError: (err: any) => {
        toast({
          title: "Error",
          description: `Failed to delete custom metric: ${err?.message || 'Unknown error'}`,
          variant: "destructive",
        });
      },
    }
  );

  useEffect(() => {
    const fetchAccount = async () => {
      if (user?.id) {
        try {
          const fetchedAccount = await getAccountForUser(user.id);
          setAccount(fetchedAccount);
        } catch (err: any) {
          toast({
            title: "Error",
            description: `Failed to fetch account: ${err?.message || 'Unknown error'}`,
            variant: "destructive",
          });
        }
      }
    };

    fetchAccount();
  }, [user?.id, toast]);

  const handleAddMetricClick = () => {
    setIsAddingMetric(true);
  };

  const handleCancelAddMetric = () => {
    setIsAddingMetric(false);
    setNewMetricFormData({ name: '', category: '', higher_is_better: true });
  };

  const handleNewMetricFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    setNewMetricFormData((prevData) => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleEditMetric = (metric: CustomMetric) => {
    setEditingMetricId(metric.id);
    setEditFormData(metric);
  };

  const handleCancelEditMetric = () => {
    setEditingMetricId(null);
    setEditFormData({});
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    setEditFormData((prevData) => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSaveEditMetric = async () => {
    if (!account || !editingMetricId) return;

    try {
      await updateMutation.mutateAsync({ metricId: editingMetricId, metricData: editFormData });
    } catch (error) {
      // The error toast is already handled in the mutation's onError
    }
  };

  const handleDeleteMetric = async (metricId: string) => {
    if (!account) return;

    try {
      await deleteMutation.mutateAsync(metricId);
    } catch (error) {
      // The error toast is already handled in the mutation's onError
    }
  };

  const handleAddCustomMetric = async (metricData: { 
    name: string; 
    category: string; 
    higher_is_better: boolean; 
    units?: string; 
    description?: string; 
    default_target_value?: number 
  }) => {
    if (!account) return;

    try {
      const requiredData = {
        name: metricData.name || 'Unnamed Metric',
        category: metricData.category || 'Custom Metrics',
        higher_is_better: metricData.higher_is_better ?? true,
        units: metricData.units,
        description: metricData.description,
        default_target_value: metricData.default_target_value ?? 0
      };

      const newMetric = await createCustomMetric(account.id, requiredData);
      
      createMutation.mutate(newMetric);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to create custom metric: ${error}`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-primary mb-6">Target Metrics Builder</h1>

      {isLoading && <p>Loading custom metrics...</p>}
      {error && <p className="text-red-500">Error: {error.message}</p>}

      <div className="mb-4">
        <Button onClick={handleAddMetricClick} disabled={isAddingMetric}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Custom Metric
        </Button>
      </div>

      {isAddingMetric && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Add New Custom Metric</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              value={newMetricFormData.name}
              onChange={handleNewMetricFormChange}
            />

            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              name="category"
              value={newMetricFormData.category}
              onChange={handleNewMetricFormChange}
            />

            <Label htmlFor="higher_is_better">Higher is Better</Label>
            <Input
              id="higher_is_better"
              name="higher_is_better"
              type="checkbox"
              checked={newMetricFormData.higher_is_better}
              onChange={handleNewMetricFormChange}
            />

            <Button onClick={() => handleAddCustomMetric(newMetricFormData)}>Create Metric</Button>
            <Button variant="secondary" onClick={handleCancelAddMetric}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {customMetrics && customMetrics.length > 0 ? (
        <div className="grid gap-4">
          {customMetrics.map((metric) => (
            <Card key={metric.id}>
              <CardHeader>
                <CardTitle>{metric.name}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <p>Category: {metric.category}</p>
                <p>Higher is Better: {metric.higher_is_better ? 'Yes' : 'No'}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleEditMetric(metric)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteMetric(metric.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p>No custom metrics created yet.</p>
      )}

      {editingMetricId && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Edit Custom Metric</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Label htmlFor="edit_name">Name</Label>
            <Input
              id="edit_name"
              name="name"
              value={editFormData.name || ''}
              onChange={handleEditFormChange}
            />

            <Label htmlFor="edit_category">Category</Label>
            <Input
              id="edit_category"
              name="category"
              value={editFormData.category || ''}
              onChange={handleEditFormChange}
            />

            <Label htmlFor="edit_higher_is_better">Higher is Better</Label>
            <Input
              id="edit_higher_is_better"
              name="higher_is_better"
              type="checkbox"
              checked={editFormData.higher_is_better === true}
              onChange={handleEditFormChange}
            />

            <Button onClick={handleSaveEditMetric}>Save Metric</Button>
            <Button variant="secondary" onClick={handleCancelEditMetric}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TargetMetricsBuilderPage;
