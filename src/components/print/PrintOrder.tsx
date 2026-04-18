import React from 'react';
import { Order, Product } from '@/types';
import { OrderTable } from '../OrderTable';
import { formatTrailerInfo } from '@/lib/utils';

interface PrintOrderProps {
  order: Order;
  productData: Product[];
}

export const PrintOrder: React.FC<PrintOrderProps> = ({ order, productData }) => {
  const hasMeta =
    order.manifestNumber ||
    order.transportCompany ||
    order.trailerType ||
    order.trailerSize;

  return (
    <div className="print-order bg-white border border-neutral-200/70 rounded-card shadow-card p-6 print:p-4 print:shadow-none">
      <div className="space-y-1 mb-4">
        <h3 className="text-lg font-semibold tracking-tight text-neutral-900">
          {order.destination}
          <span className="text-neutral-400 font-normal"> · </span>
          <span className="tabular-nums">{order.time}</span>
        </h3>
        {hasMeta && (
          <div className="text-xs text-neutral-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {order.manifestNumber && (
              <span>
                <span className="text-neutral-400">Manifest</span>{' '}
                <span className="font-medium text-neutral-700">{order.manifestNumber}</span>
              </span>
            )}
            {order.manifestNumber && (order.transportCompany || order.trailerType || order.trailerSize) && (
              <span className="text-neutral-300">•</span>
            )}
            {order.transportCompany && (
              <span className="font-medium text-neutral-700">{order.transportCompany}</span>
            )}
            {order.transportCompany && (order.trailerType || order.trailerSize) && (
              <span className="text-neutral-300">•</span>
            )}
            {(order.trailerType || order.trailerSize) && (
              <span className="font-medium text-neutral-700">
                {formatTrailerInfo(order.trailerType, order.trailerSize)}
              </span>
            )}
          </div>
        )}
      </div>
      <OrderTable order={order} productData={productData} />
    </div>
  );
};
