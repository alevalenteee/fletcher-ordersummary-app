import React from 'react';
import { Order, Product } from '@/types';
import { OrderTable } from '../OrderTable';
import { formatTrailerInfo } from '@/lib/utils';

interface PrintOrderProps {
  order: Order;
  productData: Product[];
  isLast: boolean;
}

export const PrintOrder: React.FC<PrintOrderProps> = ({ 
  order, 
  productData, 
  isLast 
}) => {
  return (
    <div className="print-order">
      <div className="mb-3">
        <h2 className="text-xl font-semibold mb-1 flex flex-col sm:flex-row sm:items-center gap-1">
          {order.destination} - {order.time} 
          {(order.manifestNumber || order.transportCompany || order.trailerType || order.trailerSize) && (
            <span className="text-base font-normal text-gray-600 sm:ml-2">
              ({[
                order.manifestNumber ? `Manifest: ${order.manifestNumber}` : '',
                order.transportCompany ? `Transport: ${order.transportCompany}` : '',
                (order.trailerType || order.trailerSize) ? formatTrailerInfo(order.trailerType, order.trailerSize) : ''
              ].filter(Boolean).join(', ')})
            </span>
          )}
        </h2>
      </div>
      <div className="overflow-x-auto">
        <OrderTable order={order} productData={productData} />
      </div>
      {!isLast && <hr className="my-6 print:my-8" />}
    </div>
  );
};