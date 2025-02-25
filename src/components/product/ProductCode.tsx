import React from 'react';
import { Product, OrderProduct } from '@/types';

interface ProductCodeProps {
  details: Product | undefined;
  code: string;
  manualDetails?: OrderProduct['manualDetails'];
}

export const ProductCode: React.FC<ProductCodeProps> = ({ details, code, manualDetails }) => {
  if (details) {
    return (
      <>
        {details.newCode} (<strong>{details.oldCode}</strong>)
      </>
    );
  }
  
  if (manualDetails?.secondaryCode) {
    return (
      <>
        {code} (<strong>{manualDetails.secondaryCode}</strong>)
      </>
    );
  }
  
  return <>{code}</>;
}