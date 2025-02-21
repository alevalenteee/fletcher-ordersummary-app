import React from 'react';
import { Product } from '@/types';

interface ProductCodeProps {
  details: Product | undefined;
  code: string;
}

export const ProductCode: React.FC<ProductCodeProps> = ({ details, code }) => {
  if (!details) {
    return <>{code}</>;
  }

  return (
    <>
      {details.newCode} (<strong>{details.oldCode}</strong>)
    </>
  );
}