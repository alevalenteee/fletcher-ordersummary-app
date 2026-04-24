import React from 'react';
import { Destination, Location, Order, Product } from '@/types';
import { PrintHeader, PrintOrder } from './print';
import { LoadingModal } from './ui/LoadingModal';
import { sortOrdersByTime, formatTodayDate } from '@/utils/time';
import '../styles/print.css';

interface PrintViewProps {
  productData: Product[];
  orders: Order[];
  locations?: Location[];
  getLocationsFor?: (orderId: string | undefined) => Record<number, string[]>;
  destinations?: Destination[];
}

export const PrintView: React.FC<PrintViewProps> = ({
  productData,
  orders,
  locations = [],
  getLocationsFor = () => ({}),
  destinations = []
}) => {
  const [loading, setLoading] = React.useState(true);
  const [error] = React.useState<string | null>(null);

  // Sort orders by time
  const sortedOrders = React.useMemo(() => {
    return sortOrdersByTime(orders);
  }, [orders]);

  // Date shown on the right of the "Orders Summary" print header. Resolved
  // at print time so what lands on paper matches the day the run sheet is
  // printed, not whenever the page first mounted.
  const printDate = React.useMemo(() => formatTodayDate(), []);

  React.useEffect(() => {
    document.title = 'Orders Summary - Print View';
    return () => {
      document.title = 'Order Management';
    };
  }, []);

  React.useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen">
        <LoadingModal isOpen={true} message="Loading orders..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-50 screen:min-h-screen print:min-h-0 print:h-auto print:bg-white">
      <div className="print-container">
        <PrintHeader />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0">
          <div className="hidden print:block print:mb-5">
            <div className="flex items-baseline justify-between gap-4">
              <h1 className="text-lg font-semibold tracking-tight text-neutral-900">
                Orders Summary
              </h1>
              <span className="text-xs font-medium uppercase tracking-wider text-neutral-500 tabular-nums">
                {printDate}
              </span>
            </div>
          </div>

          <div className="space-y-4 print:space-y-5">
            {sortedOrders.map((order) => (
              <PrintOrder
                key={`${order.id}-${order.manifestNumber}`}
                order={order}
                productData={productData}
                locations={locations}
                locationsByIndex={getLocationsFor(order.id)}
                destinations={destinations}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};