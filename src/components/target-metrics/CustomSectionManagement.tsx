import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Plus } from "lucide-react";
import { CustomSectionForm } from "./CustomSectionForm";
import { 
  getCustomSections, 
  createCustomSection, 
  updateCustomSection, 
  deleteCustomSection,
  checkSectionNameUnique,
  type CustomMetricSection 
} from "@/services/customMetricSectionsService";
import { toast } from "sonner";

interface CustomSectionManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
}

export const CustomSectionManagement: React.FC<CustomSectionManagementProps> = ({
  open,
  onOpenChange,
  accountId,
}) => {
  const [sectionFormOpen, setSectionFormOpen] = React.useState(false);
  const [editingSection, setEditingSection] = React.useState<CustomMetricSection | null>(null);
  const queryClient = useQueryClient();

  const { data: customSections = [], isLoading } = useQuery({
    queryKey: ['customSections', accountId],
    queryFn: () => getCustomSections(accountId),
    enabled: open && !!accountId,
  });

  const createSectionMutation = useMutation({
    mutationFn: createCustomSection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customSections', accountId] });
      setSectionFormOpen(false);
      toast.success("Custom section created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create section");
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      updateCustomSection(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customSections', accountId] });
      setSectionFormOpen(false);
      setEditingSection(null);
      toast.success("Section updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update section");
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: deleteCustomSection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customSections', accountId] });
      toast.success("Section deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete section");
    },
  });

  const handleAddSection = () => {
    setEditingSection(null);
    setSectionFormOpen(true);
  };

  const handleEditSection = (section: CustomMetricSection) => {
    setEditingSection(section);
    setSectionFormOpen(true);
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (confirm("Are you sure you want to delete this section? This action cannot be undone.")) {
      deleteSectionMutation.mutate(sectionId);
    }
  };

  const handleSectionSubmit = async (data: { name: string }) => {
    try {
      // Check for unique name
      const isUnique = await checkSectionNameUnique(
        accountId, 
        data.name, 
        editingSection?.id
      );
      
      if (!isUnique) {
        toast.error("A section with this name already exists");
        return;
      }

      if (editingSection) {
        updateSectionMutation.mutate({
          id: editingSection.id,
          data: { name: data.name }
        });
      } else {
        createSectionMutation.mutate({
          account_id: accountId,
          name: data.name
        });
      }
    } catch (error) {
      toast.error("Failed to validate section name");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage Custom Sections</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Create custom sections to organize your metrics
              </p>
              <Button onClick={handleAddSection} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-4">Loading sections...</div>
            ) : customSections.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No custom sections yet. Create your first one to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {customSections.map((section) => (
                  <div
                    key={section.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Badge variant="secondary">Custom</Badge>
                      <span className="font-medium">{section.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditSection(section)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSection(section.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CustomSectionForm
        open={sectionFormOpen}
        onOpenChange={setSectionFormOpen}
        onSubmit={handleSectionSubmit}
        initialData={editingSection ? { name: editingSection.name } : undefined}
        isEditing={!!editingSection}
      />
    </>
  );
};