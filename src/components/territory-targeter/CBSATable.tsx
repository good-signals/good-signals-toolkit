
import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { CBSAData, CBSAScore } from '@/types/territoryTargeterTypes';
import { getSignalStatus } from '@/lib/assessmentDisplayUtils';

interface CBSATableProps {
  cbsaData: CBSAData[];
  scores: CBSAScore[];
  marketSignalScore: number;
  accountGoodThreshold?: number | null;
  accountBadThreshold?: number | null;
}

type SortConfig = {
  key: 'name' | 'state' | 'population' | 'populationGrowth' | 'score' | 'reasoning';
  direction: 'asc' | 'desc';
} | null;

const getScorePillClasses = (signalStatus: { text: string; color: string; iconColor: string }) => {
  switch (signalStatus.text) {
    case 'Good':
      return 'bg-green-500 text-white';
    case 'Bad':
      return 'bg-red-500 text-white';
    case 'Neutral':
      return 'bg-yellow-500 text-white';
    default:
      return 'bg-gray-400 text-white';
  }
};

const formatPopulationGrowth = (growth: number) => {
  const percentage = (growth * 100).toFixed(2);
  return growth >= 0 ? `+${percentage}%` : `${percentage}%`;
};

const getGrowthColor = (growth: number) => {
  if (growth > 0.03) return 'text-green-600'; // Above 3% growth
  if (growth > 0) return 'text-green-500'; // Positive growth
  if (growth > -0.01) return 'text-yellow-600'; // Slight decline
  return 'text-red-500'; // Significant decline
};

const CBSATable: React.FC<CBSATableProps> = ({
  cbsaData,
  scores,
  marketSignalScore,
  accountGoodThreshold,
  accountBadThreshold
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  // Merge CBSA data with scores
  const tableData = useMemo(() => {
    return cbsaData.map(cbsa => {
      const scoreData = scores.find(s => s.market === cbsa.name);
      return {
        ...cbsa,
        score: scoreData?.score || null,
        reasoning: scoreData?.reasoning || 'No score available'
      };
    });
  }, [cbsaData, scores]);

  // Sort data based on current sort config
  const sortedData = useMemo(() => {
    if (!sortConfig) return tableData;

    return [...tableData].sort((a, b) => {
      let aValue: any = a[sortConfig.key];
      let bValue: any = b[sortConfig.key];

      // Handle null scores
      if (sortConfig.key === 'score') {
        aValue = aValue || 0;
        bValue = bValue || 0;
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [tableData, sortConfig]);

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const getSortIcon = (key: SortConfig['key']) => {
    if (sortConfig?.key !== key) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4" />
      : <ArrowDown className="h-4 w-4" />;
  };

  // Get signal status for market signal score
  const marketSignalStatus = getSignalStatus(marketSignalScore, accountGoodThreshold, accountBadThreshold);

  return (
    <div className="space-y-4">
      {/* Market Signal Score Summary */}
      <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
        <span className="text-sm font-medium">Market Signal Score:</span>
        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold ${getScorePillClasses(marketSignalStatus)}`}>
          {marketSignalScore}%
        </span>
        <span className="text-sm text-muted-foreground">
          (Average of all market scores)
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('name')}
                  className="h-auto p-0 font-medium"
                >
                  CBSA Name
                  {getSortIcon('name')}
                </Button>
              </TableHead>
              <TableHead className="w-[80px]">
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('state')}
                  className="h-auto p-0 font-medium"
                >
                  State
                  {getSortIcon('state')}
                </Button>
              </TableHead>
              <TableHead className="w-[120px] text-right">
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('population')}
                  className="h-auto p-0 font-medium"
                >
                  Population
                  {getSortIcon('population')}
                </Button>
              </TableHead>
              <TableHead className="w-[100px] text-right">
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('populationGrowth')}
                  className="h-auto p-0 font-medium"
                >
                  Growth
                  {getSortIcon('populationGrowth')}
                </Button>
              </TableHead>
              <TableHead className="w-[100px] text-center">
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('score')}
                  className="h-auto p-0 font-medium"
                >
                  Score
                  {getSortIcon('score')}
                </Button>
              </TableHead>
              <TableHead className="min-w-[300px]">
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('reasoning')}
                  className="h-auto p-0 font-medium"
                >
                  AI Reasoning
                  {getSortIcon('reasoning')}
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row) => {
              const signalStatus = getSignalStatus(row.score, accountGoodThreshold, accountBadThreshold);
              
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.state}</TableCell>
                  <TableCell className="text-right">{row.population.toLocaleString()}</TableCell>
                  <TableCell className={`text-right font-medium ${getGrowthColor(row.populationGrowth)}`}>
                    {formatPopulationGrowth(row.populationGrowth)}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.score !== null ? (
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold ${getScorePillClasses(signalStatus)}`}>
                        {row.score}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{row.reasoning}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CBSATable;
