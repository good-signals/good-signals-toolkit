
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { getSignalStatus } from '@/lib/assessmentDisplayUtils';
import { formatPopulationGrowth, getGrowthColor, getScorePillClasses } from '@/lib/cbsaTableUtils';

interface CBSATableRowData {
  id: string;
  name: string;
  state: string;
  region: string;
  population: number;
  populationGrowth: number;
  score: number | null;
  reasoning: string | null;
}

interface CBSATableRowProps {
  row: CBSATableRowData;
  hasScores: boolean;
  accountGoodThreshold?: number | null;
  accountBadThreshold?: number | null;
}

const CBSATableRow: React.FC<CBSATableRowProps> = ({
  row,
  hasScores,
  accountGoodThreshold,
  accountBadThreshold
}) => {
  const signalStatus = getSignalStatus(row.score, accountGoodThreshold, accountBadThreshold);
  
  return (
    <TableRow key={row.id}>
      <TableCell className="font-medium">{row.name}</TableCell>
      <TableCell>{row.state}</TableCell>
      <TableCell>{row.region}</TableCell>
      <TableCell className="text-right">{row.population.toLocaleString()}</TableCell>
      <TableCell className={`text-right font-medium ${getGrowthColor(row.populationGrowth)}`}>
        {formatPopulationGrowth(row.populationGrowth)}
      </TableCell>
      {hasScores && (
        <>
          <TableCell className="text-center">
            {row.score !== null ? (
              <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold ${getScorePillClasses(signalStatus)}`}>
                {row.score}%
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">N/A</span>
            )}
          </TableCell>
          <TableCell className="text-sm">{row.reasoning || 'No reasoning available'}</TableCell>
        </>
      )}
    </TableRow>
  );
};

export default CBSATableRow;
