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
        <strong>{details.newCode}</strong> ({details.oldCode})
      </>
    );
  }
  
  if (manualDetails?.secondaryCode) {
    return (
      <>
        <strong>{code}</strong> ({manualDetails.secondaryCode})
      </>
    );
  }
  
  return <strong>{code}</strong>;
}