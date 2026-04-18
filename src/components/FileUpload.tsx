import React from 'react';
import { parseCSV, downloadCSV } from '../utils/csv';
import { Product } from '@/types';
import { Save, Check, Database, Download } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onDataLoaded: (data: Product[]) => void;
  onSaveDefault: (data: Product[]) => void;
  productData: Product[];
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onDataLoaded, 
  onSaveDefault,
  productData,
  className
}) => {
  const [status, setStatus] = React.useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [hasChanges, setHasChanges] = React.useState(false);

  const productCount = productData.length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const csvContent = event.target?.result as string;
        const parsedData = parseCSV(csvContent);
        
        if (parsedData.length === 0) {
          throw new Error('No valid product data found in CSV');
        }

        onDataLoaded(parsedData);
        setHasChanges(true);
        setStatus({ 
          type: 'success', 
          message: `Successfully loaded ${parsedData.length} products` 
        });
      } catch (error) {
        setStatus({ 
          type: 'error', 
          message: `Error processing CSV: ${(error as Error).message}` 
        });
        console.error('CSV processing error:', error);
      }
    };

    reader.onerror = () => {
      setStatus({ type: 'error', message: 'Error reading file' });
    };

    reader.readAsText(file);
  };

  const handleSaveDefault = () => {
    onSaveDefault(productData);
    setHasChanges(false);
    setStatus({
      type: 'success',
      message: 'Successfully saved as default product data'
    });
  };

  const handleDownload = () => {
    downloadCSV(productData);
  };

  return (
    <div className={cn("section mb-6", className)}>
      <div className="bg-white p-6 sm:p-7 rounded-card border border-neutral-200/70 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-neutral-100 text-neutral-600">
              <Database className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold tracking-tight text-neutral-900">
              Product data
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-brand-50 border border-brand-200/60 rounded-full">
              <Check className="w-3 h-3 text-brand-600" />
              <span className="text-xs font-medium text-brand-700 tabular-nums">
                {productCount}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleDownload}
              variant="ghost"
              size="sm"
              className="flex items-center gap-1.5"
              disabled={productCount === 0}
              title="Download current product data as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </Button>
            {hasChanges && (
              <Button
                onClick={handleSaveDefault}
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Save as default
              </Button>
            )}
          </div>
        </div>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-neutral-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-xs file:font-medium
            file:bg-neutral-900 file:text-white
            hover:file:bg-neutral-800
            file:cursor-pointer cursor-pointer
            file:transition-colors
            file:w-full sm:file:w-auto
            file:mb-2 sm:file:mb-0"
        />
        {status && (
          <div className={cn(
            'mt-4 px-3.5 py-2.5 rounded-lg text-sm',
            status.type === 'success'
              ? 'bg-brand-50 text-brand-700 border border-brand-200/60'
              : 'bg-red-50 text-red-700 border border-red-200'
          )}>
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
};