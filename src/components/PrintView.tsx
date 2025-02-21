import React from 'react';
import { Order, Product } from '@/types';
import { PrintHeader, PrintOrder } from './print';
import { LoadingModal } from './ui/LoadingModal';
import '../styles/print.css';

interface PrintViewProps {
  productData: Product[];
  orders: Order[];
}

export const PrintView: React.FC<PrintViewProps> = ({ productData, orders }) => {
  const [fontSize, setFontSize] = React.useState(12);
  const [loading, setLoading] = React.useState(true);
  const [error] = React.useState<string | null>(null);

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
      <div className="min-h-screen bg-white p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white print:min-h-0">
      <div className="print-container" style={{ fontSize: `${fontSize}pt` }}>
        <PrintHeader
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0">
          <div className="hidden print:block print:mb-4">
            <h1 className="text-2xl font-bold">Orders Summary</h1>
          </div>
          
          <div className="space-y-4 print:space-y-6">
            {orders.map((order, index) => (
              <PrintOrder
                key={`${order.id}-${order.manifestNumber}`}
                order={order}
                productData={productData}
                isLast={index === orders.length - 1}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};