import React from 'react';
import { Order, Product } from '@/types';
import { OrderTable } from './OrderTable';

interface PrintOrderProps {
  order: Order;
  productData: Product[];
  isLast?: boolean;
}

export const PrintOrder: React.FC<PrintOrderProps> = ({ 
  order, 
  productData, 
  isLast = false 
}) => {
  return (
    <div className="print-order">
      <div className="mb-3">
        <h2 className="text-xl font-semibold mb-1">
          {order.destination} - {order.time} 
          {(order.manifestNumber || order.transportCompany) && (
            <span className="text-base font-normal text-gray-600 ml-2">
              ({order.manifestNumber ? `Manifest: ${order.manifestNumber}` : ''}{order.manifestNumber && order.transportCompany ? ', ' : ''}{order.transportCompany ? `Transport: ${order.transportCompany}` : ''})
            </span>
          )}
        </h2>
        {(order.manifestNumber || order.transportCompany) && (
          <div className="text-base text-gray-700 font-medium print:text-black">
            {order.manifestNumber && (
              <span>Manifest Number: {order.manifestNumber}</span>
            )}
            {order.manifestNumber && order.transportCompany && (
              <span className="text-gray-500 mx-2">•</span>
            )}
            {order.transportCompany && (
              <span>Transport Company: {order.transportCompany}</span>
            )}
          </div>
        )}
      </div>
      <OrderTable order={order} productData={productData} />
      {!isLast && <hr className="my-4 print:my-6" />}
    </div>
  );
};