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
    
    // For Unknown type, always display as Units (for AI-analyzed unknown products)
    if (manualDetails.type === 'Unknown') {
      return <strong>{packsNum} Units</strong>;
    }
    
    // For Batt or Roll types, display in Bales
    if (manualDetails.type === 'Batt' || manualDetails.type === 'Roll') {
      if (manualDetails.packsPerBale) {
        const bales = packsNum / manualDetails.packsPerBale;
        return (
          <strong>
            {Number.isInteger(bales) ? bales : bales.toFixed(1)} Bales
          </strong>
        );
      } else {
        // If packsPerBale is not defined, assume 1 pack = 1 bale
        return <strong>{packsNum} Bales</strong>;
      }
    }
    
    // For Board or Pallet types, display in Units
    return <strong>{packsNum} Units</strong>;
  }

  const output = convertToOutput(code, packs, productData);
  const unit = getOutputUnit(code, productData);

  return (
    <strong>
      {output} {unit}
    </strong>
  );
}