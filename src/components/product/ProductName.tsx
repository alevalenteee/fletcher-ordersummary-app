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
          ⚠️ Unknown Product: {code}
        </span>
        {onAddDetails && (
          <button
            onClick={onAddDetails}
            className="ml-2 text-sm text-blue-600 hover:text-blue-700"
          >
            Add Details
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {details.category} {formatRValue(details.rValue)}
      {details.width && (
        <span className="text-gray-500 ml-1">({details.width})</span>
      )}
    </>
  );
}