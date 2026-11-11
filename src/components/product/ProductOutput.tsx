import React from 'react';
import { Product, OrderProduct } from '@/types';
import { convertToOutput, getOutputUnit } from '@/utils';

interface ProductOutputProps {
  code: string;
  packs: string;
  productData: Product[];
  manualDetails?: OrderProduct['manualDetails'];
  isAwning?: boolean;
  // When true, render the awning `(A)` marker in the same ink-pen blue
  // used for bin codes in PrintOrder so all location-flavoured info reads
  // as a single annotation layer on the printed sheet.
  isPrint?: boolean;
}

export const ProductOutput: React.FC<ProductOutputProps> = ({
  code,
  packs,
  productData,
  manualDetails,
  isAwning,
  isPrint,
}) => {
  const awningMarker = isAwning ? (
    <span
      className={`italic ${isPrint ? 'mr-1 text-blue-700 font-medium' : 'ml-1 text-neutral-500'}`}
    >
      (A)
    </span>
  ) : null;

  let output: string | number;
  let unit: string;

  if (manualDetails) {
    const packsNum = parseFloat(packs);

    if (manualDetails.type === 'Batt' || manualDetails.type === 'Roll') {
      const baleSize = manualDetails.packsPerBale;
      const bales = packsNum / (baleSize || 1);
      output = baleSize && !Number.isInteger(bales) ? bales.toFixed(1) : bales;
      unit = 'Bales';
    } else {
      output = packsNum;
      unit = 'Units';
    }
  } else {
    output = convertToOutput(code, packs, productData);
    unit = getOutputUnit(code, productData);
  }

  return (
    <>
      {isPrint ? awningMarker : null}
      <strong>
        {output} {unit}
      </strong>
      {isPrint ? null : awningMarker}
    </>
  );
}
