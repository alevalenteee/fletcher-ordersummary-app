import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '../ui/Button';

interface PrintSizeControlProps {
  fontSize: number;
  onIncrease: () => void;
  onDecrease: () => void;
}

export const PrintSizeControl: React.FC<PrintSizeControlProps> = ({
  fontSize,
  onIncrease,
  onDecrease
}) => {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium text-gray-700">Font Size:</span>
      <div className="flex items-center gap-2">
        <Button
          onClick={onDecrease}
          variant="outline"
          size="sm"
          className="p-1 hover:bg-gray-100"
          aria-label="Decrease font size"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="min-w-[3rem] text-center font-medium">
          {fontSize}pt
        </span>
        <Button
          onClick={onIncrease}
          variant="outline"
          size="sm"
          className="p-1 hover:bg-gray-100"
          aria-label="Increase font size"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};