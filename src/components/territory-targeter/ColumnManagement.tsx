
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Trash2, Settings, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CriteriaColumn } from '@/types/territoryTargeterTypes';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ColumnManagementProps {
  criteriaColumns: CriteriaColumn[];
  onToggleColumn: (columnId: string, included: boolean) => void;
  onDeleteColumn: (columnId: string) => void;
  onRenameColumn: (columnId: string, newTitle: string) => void;
}

const ColumnManagement: React.FC<ColumnManagementProps> = ({
  criteriaColumns,
  onToggleColumn,
  onDeleteColumn,
  onRenameColumn
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');

  if (criteriaColumns.length === 0) {
    return null;
  }

  const includedCount = criteriaColumns.filter(col => col.isIncludedInSignalScore !== false).length;

  return (
    <Card className="mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Column Management
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="text-sm text-muted-foreground font-normal">
                        ({includedCount} of {criteriaColumns.length} columns included)
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Control which criteria columns are included in the Market Signal Score calculation</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="space-y-3">
              {criteriaColumns.map((column) => {
                const isIncluded = column.isIncludedInSignalScore !== false;
                
                return (
                  <div key={column.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <Switch
                        checked={isIncluded}
                        onCheckedChange={(checked) => onToggleColumn(column.id, checked)}
                        disabled={criteriaColumns.length === 1}
                      />
                      <div className="flex-1">
                        {editingId === column.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              placeholder="Enter column title"
                              className="max-w-sm"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={() => {
                                onRenameColumn(column.id, editTitle);
                                setEditingId(null);
                              }}
                              disabled={!editTitle.trim()}
                              aria-label="Save column title"
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingId(null)}
                              aria-label="Cancel edit"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="font-medium truncate" title={column.title}>{column.title}</div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingId(column.id);
                                setEditTitle(column.title);
                              }}
                              aria-label="Edit column title"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {column.logicSummary}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {column.analysisMode}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {column.scores.length} markets
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Criteria Column</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{column.title}"? This action cannot be undone and will remove all scores and data for this criteria.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDeleteColumn(column.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default ColumnManagement;
