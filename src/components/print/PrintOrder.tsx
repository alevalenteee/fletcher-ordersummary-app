import React from 'react';
import { Location, Order, Product } from '@/types';
import { OrderTable } from '../OrderTable';
import { formatTrailerInfo } from '@/lib/utils';

interface PrintOrderProps {
  order: Order;
  productData: Product[];
  locations?: Location[];
  locationsByIndex?: Record<number, string[]>;
}

export const PrintOrder: React.FC<PrintOrderProps> = ({
  order,
  productData,
  locations = [],
  locationsByIndex = {}
}) => {
  const hasMeta =
    order.manifestNumber ||
    order.transportCompany ||
    order.trailerType ||
    order.trailerSize;

  return (
    <div className="print-order bg-white border border-neutral-200/70 rounded-card shadow-card p-6 print:p-4 print:shadow-none">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <h3 className="text-lg font-semibold tracking-tight text-neutral-900 whitespace-nowrap">
          {order.destination}
          <span className="text-neutral-400 font-normal"> · </span>
          <span className="tabular-nums">{order.time}</span>
        </h3>
        {hasMeta && (
          <div className="text-xs text-neutral-500 flex items-center gap-x-2 flex-nowrap whitespace-nowrap">
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
      <OrderTable
        order={order}
        productData={productData}
        locations={locations}
        locationsByIndex={locationsByIndex}
      />
    </div>
  );
};
