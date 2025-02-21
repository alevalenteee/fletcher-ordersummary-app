import React from 'react';
import { parseCSV } from '../utils/csv';
import { Product } from '@/types';
import { Save, Check } from 'lucide-react';
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

  return (
    <div className={cn("section mb-6", className)}>
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h2 className="text-xl font-semibold">Upload Product Data</h2>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
            <Check className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              {productCount} products loaded
            </span>
          </div>
          {hasChanges && (
            <Button
              onClick={handleSaveDefault}
              variant="outline"
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <Save className="w-4 h-4" />
              Save as Default
            </Button>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Default product data is loaded. Upload a CSV file to override.
        </p>
        <div className="form-group">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CSV File
          </label>
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileChange}
            className="block w-full text-base sm:text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-black file:text-white
              hover:file:bg-gray-800
              file:w-full sm:file:w-auto
              file:mb-2 sm:file:mb-0"
          />
        </div>
        {status && (
          <div className={`mt-4 p-4 rounded-md ${
            status.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
};