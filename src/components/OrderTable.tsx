import React from 'react';
import { Location, Order, Product, OrderProduct, SplitLoadTrailer } from '@/types';
import { TableHeader } from './table/TableHeader';
import { TableRow } from './table/TableRow';
import { SplitLoadStopHeader } from './splitLoad/SplitLoadStopHeader';
import {
  buildPrintTrailerGroups,
  getTrailerGroupStyles,
  hasAssignedTrailers,
  trailerLabel,
} from '@/utils/splitLoad';

interface OrderTableProps {
  order: Order;
  productData: Product[];
  onUpdateProduct?: (index: number, product: OrderProduct) => void;
  onToggleMustGo?: (productIndex: number) => Promise<void> | void;
  onUpdateSplitLoadTrailer?: (stopIndex: number, trailer: SplitLoadTrailer | null) => void;
  locations?: Location[];
  locationsByIndex?: Record<number, string[]>;
  /** Keys `${orderId}:${productIndex}` for rows flagged as short on stock. */
  stockWarningKeys?: Set<string>;
  isPrint?: boolean;
  onAddProductToCatalogue?: (product: OrderProduct) => void;
}

function renderProductRows(
  order: Order,
  productData: Product[],
  indexes: number[],
  props: Pick<
    OrderTableProps,
    'onUpdateProduct' | 'onToggleMustGo' | 'locations' | 'locationsByIndex' | 'stockWarningKeys' | 'isPrint' | 'onAddProductToCatalogue'
  >
) {
  const {
    onUpdateProduct,
    onToggleMustGo,
    locations = [],
    locationsByIndex = {},
    stockWarningKeys,
    isPrint = false,
    onAddProductToCatalogue,
  } = props;

  return indexes.map((index) => {
    const product = order.products[index];
    if (!product) return null;
    return (
      <TableRow
        key={index}
        product={product}
        productData={productData}
        onUpdateProduct={
          onUpdateProduct
            ? (updatedProduct) => onUpdateProduct(index, updatedProduct)
            : undefined
        }
        onToggleMustGo={onToggleMustGo ? () => onToggleMustGo(index) : undefined}
        locations={locationsByIndex[index]}
        allLocations={locations}
        showStockWarning={
          !!order.id && !!stockWarningKeys?.has(`${order.id}:${index}`)
        }
        isPrint={isPrint}
        onAddToCatalogue={onAddProductToCatalogue}
      />
    );
  });
}

function ProductTable({
  order,
  productData,
  indexes,
  rowProps,
}: {
  order: Order;
  productData: Product[];
  indexes: number[];
  rowProps: Pick<
    OrderTableProps,
    'onUpdateProduct' | 'onToggleMustGo' | 'locations' | 'locationsByIndex' | 'stockWarningKeys' | 'isPrint' | 'onAddProductToCatalogue'
  >;
}) {
  return (
    <table className="w-full border-collapse">
      <colgroup>
        <col style={{ width: '40%' }} />
        <col style={{ width: '30%' }} />
        <col style={{ width: '15%' }} />
        <col style={{ width: '15%' }} />
      </colgroup>
      <TableHeader />
      <tbody>{renderProductRows(order, productData, indexes, rowProps)}</tbody>
    </table>
  );
}

export const OrderTable: React.FC<OrderTableProps> = ({
  order,
  productData,
  onUpdateProduct,
  onToggleMustGo,
  onUpdateSplitLoadTrailer,
  locations = [],
  locationsByIndex = {},
  stockWarningKeys,
  isPrint = false,
  onAddProductToCatalogue,
}) => {
  const rowProps = {
    onUpdateProduct,
    onToggleMustGo,
    locations,
    locationsByIndex,
    stockWarningKeys,
    isPrint,
    onAddProductToCatalogue,
  };

  const allIndexes = order.products.map((_, i) => i);
  const isSplitLoad = order.splitLoad && order.splitLoad.stops.length > 1;

  // Screen: one bordered group per delivery stop, with inline trailer selector.
  if (isSplitLoad && !isPrint) {
    return (
      <div className="overflow-x-auto print:overflow-visible space-y-3">
        {order.splitLoad!.stops.map((stop, stopIndex) => {
          const styles = getTrailerGroupStyles(stop.trailer, { isPrint: false });
          return (
            <div key={stopIndex} className={styles.border}>
              <SplitLoadStopHeader
                destination={stop.destination}
                deliveryAddress={stop.deliveryAddress}
                trailer={stop.trailer}
                onTrailerChange={
                  onUpdateSplitLoadTrailer
                    ? (trailer) => onUpdateSplitLoadTrailer(stopIndex, trailer)
                    : undefined
                }
              />
              <ProductTable
                order={order}
                productData={productData}
                indexes={stop.productIndexes}
                rowProps={rowProps}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // Print: merge by assigned trailer (A / B / unassigned).
  const usePrintTrailerGroups =
    isPrint && isSplitLoad && hasAssignedTrailers(order);

  if (usePrintTrailerGroups) {
    const groups = buildPrintTrailerGroups(order);

    return (
      <div className="overflow-x-auto print:overflow-visible space-y-3">
        {groups.map((group) => {
          const isTrailerGroup = group.trailer === 'A' || group.trailer === 'B';

          if (isTrailerGroup && group.trailer) {
            const styles = getTrailerGroupStyles(group.trailer, { isPrint: true });
            return (
              <div key={group.trailer} className={styles.border}>
                <p className={styles.label}>{trailerLabel(group.trailer)}</p>
                <ProductTable
                  order={order}
                  productData={productData}
                  indexes={group.productIndexes}
                  rowProps={rowProps}
                />
              </div>
            );
          }

          return (
            <ProductTable
              key="unassigned"
              order={order}
              productData={productData}
              indexes={group.productIndexes}
              rowProps={rowProps}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto print:overflow-visible">
      <ProductTable
        order={order}
        productData={productData}
        indexes={allIndexes}
        rowProps={rowProps}
      />
    </div>
  );
};
