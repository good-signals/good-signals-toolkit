
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { getSignalStatus } from '@/lib/assessmentDisplayUtils';
import { formatPopulationGrowth, getGrowthColor, getScorePillClasses } from '@/lib/cbsaTableUtils';
import { CriteriaColumn, CBSAStatus } from '@/types/territoryTargeterTypes';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import CBSAStatusSelector from './CBSAStatusSelector';

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
  isEvenRow?: boolean;
}

const CBSATableRow: React.FC<CBSATableRowProps> = ({
  row,
  criteriaColumns,
  accountGoodThreshold,
  accountBadThreshold,
  onStatusChange,
  onScoreClick,
  isEvenRow = false
}) => {
  const signalStatus = getSignalStatus(row.marketSignalScore, accountGoodThreshold, accountBadThreshold);
  
  // Add debug logging for market signal score
  console.log(`Market Signal Score for ${row.name}:`, {
    score: row.marketSignalScore,
    goodThreshold: accountGoodThreshold,
    badThreshold: accountBadThreshold,
    signalStatus
  });
  
  // Build reasoning with clickable sources
  const combinedReasoningItems = criteriaColumns.length > 0 ? criteriaColumns
    .map((column) => {
      const scoreData = row.criteriaScores[column.id];
      if (!scoreData?.reasoning) return null;

      const sources = Array.isArray(scoreData.sources) ? scoreData.sources.filter(Boolean) : [];

      const isLikelyUrl = (s: string) => /^(https?:\/\/)/i.test(s) || /^[\w.-]+\.[a-z]{2,}/i.test(s);
      const toUrl = (s: string) => (s && /^(https?:\/\/)/i.test(s)) ? s : (isLikelyUrl(s) ? `https://${s}` : s);
      const displayForSource = (s: string) => {
        try {
          const u = new URL(toUrl(s));
          return u.hostname.replace(/^www\./, '');
        } catch {
          return s;
        }
      };

      return (
        <div key={column.id} className="mb-2">
          <div className="font-medium inline">{column.title}:</div>{' '}
          <span className="text-foreground/90">{scoreData.reasoning}</span>
          {sources.length > 0 && (
            <div className="mt-1 text-xs text-muted-foreground">
              Sources:{' '}
              {sources.map((src, idx) => (
                <a
                  key={`${column.id}-src-${idx}`}
                  href={toUrl(src)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:opacity-80"
                >
                  {displayForSource(src)}
                </a>
              )).reduce<React.ReactNode[]>((acc, el, idx) => (
                idx === 0 ? [el] : [...acc, ', ', el]
              ), [])}
            </div>
          )}
        </div>
      );
    })
    .filter(Boolean) as React.ReactNode[] : [];

  const hasReasoning = combinedReasoningItems.length > 0;
  const showMarketSignalScore = criteriaColumns.length > 1;
  const hasScores = criteriaColumns.length > 0;

  return (
    <TableRow key={row.id} className={isEvenRow ? 'bg-muted/30' : ''}>
      <TableCell className="font-medium sticky left-0 z-10 bg-background border-r">{row.name}</TableCell>
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
        
        // Add debug logging for individual column scores
        const columnSignalStatus = getSignalStatus(scoreData?.score, accountGoodThreshold, accountBadThreshold);
        console.log(`Column score for ${row.name} - ${column.title}:`, {
          score: scoreData?.score,
          goodThreshold: accountGoodThreshold,
          badThreshold: accountBadThreshold,
          signalStatus: columnSignalStatus
        });
        
        return (
          <TableCell key={column.id} className="text-center">
            {scoreData?.score !== null && scoreData?.score !== undefined ? (
              <div className="flex items-center justify-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onScoreClick(row.name, column.id)}
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${getScorePillClasses(columnSignalStatus)} ${isManualOverride ? 'ring-2 ring-blue-400' : ''}`}
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
      {hasScores && (
        <TableCell className="text-sm">
          {hasReasoning ? combinedReasoningItems : 'No reasoning available'}
        </TableCell>
      )}
    </TableRow>
  );
};

export default CBSATableRow;

