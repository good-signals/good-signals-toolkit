
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ManualScoreOverride } from '@/types/territoryTargeterTypes';

interface ManualScoreOverrideProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (override: ManualScoreOverride) => void;
  marketName: string;
  columnId: string;
  columnTitle: string;
  currentScore?: number;
  currentReasoning?: string;
}

const ManualScoreOverrideDialog: React.FC<ManualScoreOverrideProps> = ({
  isOpen,
  onClose,
  onSave,
  marketName,
  columnId,
  columnTitle,
  currentScore,
  currentReasoning
}) => {
  const [score, setScore] = useState(currentScore?.toString() || '');
  const [reasoning, setReasoning] = useState(currentReasoning || '');

  const handleSave = () => {
    const scoreNum = parseFloat(score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      return;
    }
    
    if (!reasoning.trim()) {
      return;
    }

    onSave({
      marketName,
      columnId,
      score: scoreNum,
      reasoning: reasoning.trim()
    });
    
    onClose();
  };

  const handleClose = () => {
    setScore(currentScore?.toString() || '');
    setReasoning(currentReasoning || '');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Override Score</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Market:</Label>
            <p className="text-sm text-muted-foreground">{marketName}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Criteria:</Label>
            <p className="text-sm text-muted-foreground">{columnTitle}</p>
          </div>
          <div>
            <Label htmlFor="score">Score (0-100)</Label>
            <Input
              id="score"
              type="number"
              min="0"
              max="100"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="Enter score..."
            />
          </div>
          <div>
            <Label htmlFor="reasoning">Reasoning</Label>
            <Textarea
              id="reasoning"
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Explain your reasoning for this score..."
              className="min-h-[100px]"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!score || !reasoning.trim() || isNaN(parseFloat(score))}
            >
              Save Override
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualScoreOverrideDialog;
