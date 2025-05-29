
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Edit3, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CriteriaColumn } from '@/types/territoryTargeterTypes';

interface ExecutiveSummaryProps {
  criteriaColumns: CriteriaColumn[];
  onEditCriteria?: (columnId: string) => void;
}

const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({ 
  criteriaColumns, 
  onEditCriteria 
}) => {
  const [isOpen, setIsOpen] = useState(true);

  if (criteriaColumns.length === 0) return null;

  return (
    <Card className="mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                AI Logic Summary
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
          <CardContent className="space-y-6">
            {criteriaColumns.map((column, index) => (
              <div key={column.id} className="border-b pb-4 last:border-b-0">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">
                      Criteria {index + 1}: {column.title}
                    </h4>
                    <p className="text-sm bg-muted/30 p-3 rounded-md italic">
                      "{column.prompt}"
                    </p>
                  </div>
                  {onEditCriteria && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditCriteria(column.id)}
                      className="ml-2"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div>
                  <h5 className="text-sm font-medium text-muted-foreground mb-2">
                    AI Analysis Logic ({column.analysisMode === 'fast' ? 'Fast' : 'Detailed'}):
                  </h5>
                  <p className="text-sm leading-relaxed">
                    {column.logicSummary}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default ExecutiveSummary;
