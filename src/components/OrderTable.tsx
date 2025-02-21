import React from 'react';
import { Order, Product, OrderProduct } from '@/types';
import { TableHeader } from './table/TableHeader';
import { TableRow } from './table/TableRow';

interface OrderTableProps {
  order: Order;
  productData: Product[];
  onUpdateProduct?: (index: number, product: OrderProduct) => void;
}

export const OrderTable: React.FC<OrderTableProps> = ({ 
  order, 
  productData,
  onUpdateProduct 
}) => (
  <div className="overflow-x-auto print:overflow-visible">
    <table className="w-full border-collapse">
      <colgroup>
        <col style={{ width: '40%' }} />
        <col style={{ width: '30%' }} />
        <col style={{ width: '15%' }} />
        <col style={{ width: '15%' }} />
      </colgroup>
      <TableHeader />
      <tbody>
        {order.products.map((product, index) => (
          <TableRow
            key={index}
            product={product}
            productData={productData}
            onUpdateProduct={onUpdateProduct ? 
              (updatedProduct) => onUpdateProduct(index, updatedProduct) : 
              undefined
            }
          />
        ))}
      </tbody>
    </table>
  </div>
);