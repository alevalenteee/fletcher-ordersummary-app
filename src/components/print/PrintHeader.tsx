import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import { PrintSizeControl } from './PrintSizeControl';

interface PrintHeaderProps {
  fontSize: number;
  onFontSizeChange: (size: number) => void;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({
  fontSize,
  onFontSizeChange,
}) => {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-10 bg-white border-b print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
            <h1 className="text-2xl font-bold">Print Preview</h1>
            <PrintSizeControl 
              fontSize={fontSize}
              onIncrease={() => onFontSizeChange(Math.min(fontSize + 0.5, 14))}
              onDecrease={() => onFontSizeChange(Math.max(fontSize - 0.5, 8))}
            />
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Button
              onClick={() => window.print()}
              variant="default"
              size="lg"
              className="flex items-center space-x-2 hover:bg-gray-800 w-full sm:w-auto justify-center"
            >
              <Printer className="w-5 h-5" />
              <span>Print Orders</span>
            </Button>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              size="lg"
              className="flex items-center space-x-2 hover:bg-gray-50 w-full sm:w-auto justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Orders</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};