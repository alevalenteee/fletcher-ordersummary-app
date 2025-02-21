import React from 'react';
import { Product, OrderProduct } from '@/types';
import { convertToOutput, getOutputUnit } from '@/utils';

interface ProductOutputProps {
  code: string;
  packs: string;
  productData: Product[];
  manualDetails?: OrderProduct['manualDetails'];
}

export const ProductOutput: React.FC<ProductOutputProps> = ({ 
  code, 
  packs, 
  productData,
  manualDetails 
}) => {
  if (manualDetails) {
    const packsNum = parseFloat(packs);
    if (manualDetails.packsPerBale) {
      const bales = packsNum / manualDetails.packsPerBale;
      return (
        <strong>
          {Number.isInteger(bales) ? bales : bales.toFixed(1)} Bales
        </strong>
      );
    }
    return <strong>{packsNum} {manualDetails.type === 'Pallet' ? 'Pallets' : 'Units'}</strong>;
  }

  const output = convertToOutput(code, packs, productData);
  const unit = getOutputUnit(code, productData);

  return (
    <strong>
      {output} {unit}
    </strong>
  );
}