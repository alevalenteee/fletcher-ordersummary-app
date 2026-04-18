import React from 'react';
import { Product } from '@/types';
import { formatRValue } from '@/utils';

interface ProductNameProps {
  details: Product | undefined;
  code: string;
  onAddDetails?: () => void;
}

export const ProductName: React.FC<ProductNameProps> = ({ details, code, onAddDetails }) => {
  if (!details) {
    return (
      <div>
        <span className="text-red-600 print:text-red-700">
          ⚠️ Unknown product: {code}
        </span>
        {onAddDetails && (
          <button
            onClick={onAddDetails}
            className="ml-2 text-xs text-neutral-700 underline hover:text-neutral-900 transition-colors"
          >
            Add details
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {details.category} {formatRValue(details.rValue)}
      {details.width && (
        <span className="text-neutral-500 ml-1">({details.width})</span>
      )}
    </>
  );
}