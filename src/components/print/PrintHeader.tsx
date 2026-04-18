import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';

export const PrintHeader: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-neutral-200/70 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-base font-semibold tracking-tight text-neutral-900">
            Print preview
          </h1>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="flex items-center gap-1.5 w-full sm:w-auto justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to orders</span>
            </Button>
            <Button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 w-full sm:w-auto justify-center"
            >
              <Printer className="w-4 h-4" />
              <span>Print orders</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
