
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { getSignalStatus } from '@/lib/assessmentDisplayUtils';
import { formatPopulationGrowth, getGrowthColor, getScorePillClasses } from '@/lib/cbsaTableUtils';
import { CriteriaColumn } from '@/types/territoryTargeterTypes';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import CBSAStatusSelector, { CBSAStatus } from './CBSAStatusSelector';

interface CBSATableRowData {
  id: string;
  name: string;
  state: string;
  region: string;
  population: number;
  populationGrowth: number;
  status?: CBSAStatus;
  criteriaScores: {
    [columnId: string]: {
      score: number | null;
      reasoning: string | null;
      sources?: string[];
    };
  };
  marketSignalScore?: number | null;
}

interface CBSATableRowProps {
  row: CBSATableRowData;
  criteriaColumns: CriteriaColumn[];
  accountGoodThreshold?: number | null;
  accountBadThreshold?: number | null;
  onStatusChange: (cbsaId: string, status: CBSAStatus) => void;
  onScoreClick: (marketName: string, columnId: string) => void;
}

const CBSATableRow: React.FC<CBSATableRowProps> = ({
  row,
  criteriaColumns,
  accountGoodThreshold,
  accountBadThreshold,
  onStatusChange,
  onScoreClick
}) => {
  const signalStatus = getSignalStatus(row.marketSignalScore, accountGoodThreshold, accountBadThreshold);
  
  // Combine all reasoning into one text
  const combinedReasoning = criteriaColumns
    .map((column, index) => {
      const scoreData = row.criteriaScores[column.id];
      if (!scoreData?.reasoning) return null;
      
      let reasoning = `${column.title}: ${scoreData.reasoning}`;
      
      // Add sources if available
      if (scoreData.sources && scoreData.sources.length > 0) {
        reasoning += ` (Sources: ${scoreData.sources.join(', ')})`;
      }
      
      return reasoning;
    })
    .filter(Boolean)
    .join(' | ');

  const showMarketSignalScore = criteriaColumns.length > 1;

  return (
    <TableRow key={row.id}>
      <TableCell className="font-medium">{row.name}</TableCell>
      <TableCell>{row.state}</TableCell>
      <TableCell>{row.region}</TableCell>
      <TableCell>
        <CBSAStatusSelector
          value={row.status}
          onValueChange={(status) => onStatusChange(row.id, status)}
          cbsaId={row.id}
        />
      </TableCell>
      <TableCell className="text-right">{row.population.toLocaleString()}</TableCell>
      <TableCell className={`text-right font-medium ${getGrowthColor(row.populationGrowth)}`}>
        {formatPopulationGrowth(row.populationGrowth)}
      </TableCell>
      {criteriaColumns.map((column) => {
        const scoreData = row.criteriaScores[column.id];
        const isManualOverride = column.isManuallyOverridden?.[row.name];
        
        return (
          <TableCell key={column.id} className="text-center">
            {scoreData?.score !== null && scoreData?.score !== undefined ? (
              <div className="flex items-center justify-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onScoreClick(row.name, column.id)}
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${getScorePillClasses(
                    getSignalStatus(scoreData.score, accountGoodThreshold, accountBadThreshold)
                  )} ${isManualOverride ? 'ring-2 ring-blue-400' : ''}`}
                >
                  {scoreData.score}%
                  {isManualOverride && <Edit className="ml-1 h-3 w-3" />}
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onScoreClick(row.name, column.id)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                N/A
              </Button>
            )}
          </TableCell>
        );
      })}
      {showMarketSignalScore && (
        <TableCell className="text-center">
          {row.marketSignalScore !== null && row.marketSignalScore !== undefined ? (
            <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold border-2 border-blue-200 ${getScorePillClasses(signalStatus)}`}>
              {Math.round(row.marketSignalScore)}%
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">N/A</span>
          )}
        </TableCell>
      )}
      {criteriaColumns.length > 0 && (
        <TableCell className="text-sm">
          {combinedReasoning || 'No reasoning available'}
        </TableCell>
      )}
    </TableRow>
  );
};

export default CBSATableRow;
