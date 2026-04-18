import React from 'react';
import { Product, OrderProduct } from '@/types';

interface ProductCodeProps {
  details: Product | undefined;
  code: string;
  manualDetails?: OrderProduct['manualDetails'];
  location?: string;
}

export const ProductCode: React.FC<ProductCodeProps> = ({ details, code, manualDetails, location }) => {
  const locationSuffix = location ? (
    <span className="italic text-neutral-500 ml-1">{location}</span>
  ) : null;

  if (details) {
    return (
      <>
        <strong>{details.newCode}</strong> ({details.oldCode}){locationSuffix}
      </>
    );
  }

  if (manualDetails?.secondaryCode) {
    return (
      <>
        <strong>{code}</strong> ({manualDetails.secondaryCode}){locationSuffix}
      </>
    );
  }

  return (
    <>
      <strong>{code}</strong>{locationSuffix}
    </>
  );
}