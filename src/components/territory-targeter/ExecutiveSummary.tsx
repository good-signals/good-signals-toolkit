
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CriteriaColumn } from '@/types/territoryTargeterTypes';

interface ExecutiveSummaryProps {
  criteriaColumns: CriteriaColumn[];
  onEditCriteria?: (columnId: string) => void;
}

const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({ 
  criteriaColumns, 
  onEditCriteria 
}) => {
  if (criteriaColumns.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Analysis Summary
        </CardTitle>
      </CardHeader>
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
    </Card>
  );
};

export default ExecutiveSummary;
