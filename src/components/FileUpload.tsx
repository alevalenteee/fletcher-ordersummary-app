import React from 'react';
import { downloadCSV } from '../utils/csv';
import { Product } from '@/types';
import { Check, Database, Download, Pencil } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  productData: Product[];
  // Parent (HomePage) owns the ProductCatalogueModal so the "Add to
  // database" action on unknown order lines can open the same modal with
  // prefilled data. This card just triggers the open with no seed.
  onOpenCatalogue: () => void;
  // Optional toast-style status surfaced under the card after a save.
  // Driven by the parent since the save flow now lives up there too.
  status?: { type: 'success' | 'error'; message: string } | null;
  className?: string;
}

// Kept the filename for import stability; the card is now "Product data".
// Modal ownership was hoisted to HomePage so the catalogue editor can be
// opened from multiple entry points (this card + unknown product rows).
export const FileUpload: React.FC<FileUploadProps> = ({
  productData,
  onOpenCatalogue,
  status,
  className,
}) => {
  const productCount = productData.length;

  const handleDownload = () => {
    if (productCount === 0) return;
    downloadCSV(productData);
  };

  return (
    <div className={cn('section mb-6', className)}>
      <div className="bg-white p-6 sm:p-7 rounded-card border border-neutral-200/70 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
            <Button
              onClick={onOpenCatalogue}
              size="sm"
              className="flex items-center gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit catalogue
            </Button>
          </div>
        </div>

        {status && (
          <div
            className={cn(
              'mt-4 px-3.5 py-2.5 rounded-lg text-sm',
              status.type === 'success'
                ? 'bg-brand-50 text-brand-700 border border-brand-200/60'
                : 'bg-red-50 text-red-700 border border-red-200'
            )}
          >
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
};
