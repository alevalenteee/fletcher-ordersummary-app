import React from 'react';
import { Button } from '@/components/ui/Button';
import { Archive } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { LoadingModal } from '@/components/ui/LoadingModal';
import { Order, Product } from '@/types';
import { FileUpload } from '@/components/FileUpload';
import { OrderForm } from '@/components/OrderForm';
import { OrdersList } from '@/components/OrdersList';
import { SavedOrdersModal } from '@/components/SavedOrdersModal';
import { PDFAnalyzer } from '@/components/PDFAnalyzer';

interface HomePageProps {
  productData: Product[];
  onDataLoaded: (data: any[]) => void;
  onSaveDefault: (data: any[]) => Promise<void>;
  onOrderSubmit: (order: Order) => Promise<void>;
  onEditOrder: (index: number) => void;
  onDeleteOrder: (index: number) => Promise<void>;
  editingOrder: Order | null;
  orders: Order[];
}

export const HomePage: React.FC<HomePageProps> = ({
  productData,
  onDataLoaded,
  onSaveDefault,
  onOrderSubmit,
  onEditOrder,
  onDeleteOrder,
  editingOrder,
  orders
}) => {
  const [showSavedOrders, setShowSavedOrders] = React.useState(false);
  const {
    loading,
    isSubmitting,
    error,
  } = useOrders();

  if (loading) {
    return (
      <div className="min-h-[400px]">
        <LoadingModal isOpen={true} message="Loading orders..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
        {error}
      </div>
    );
  }

  return (
    <>
      <LoadingModal isOpen={isSubmitting} message="Updating Orders..." />
      
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <div className="w-full sm:w-auto" />
        <Button
          variant="outline"
          onClick={() => setShowSavedOrders(true)}
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          <Archive className="w-5 h-5" />
          View Orders
        </Button>
      </div>

      <FileUpload 
        onDataLoaded={onDataLoaded}
        onSaveDefault={onSaveDefault}
        productData={productData}
        className="md:block"
      />
      
      <PDFAnalyzer
        productData={productData}
        onOrdersAnalyzed={async (analyzedOrders) => {
          for (const order of analyzedOrders) {
            try {
              await onOrderSubmit(order);
            } catch (error) {
              console.error('Error submitting order:', error);
            }
          }
        }}
      />
      
      <OrderForm
        productData={productData}
        onSubmit={onOrderSubmit}
        initialOrder={editingOrder}
      />
      
      <OrdersList
        orders={orders}
        productData={productData}
        onEditOrder={onEditOrder}
        onDeleteOrder={onDeleteOrder}
        onUpdateOrder={async (_, updatedOrder) => {
          try {
            await onOrderSubmit(updatedOrder);
          } catch (error) {
            console.error('Error updating order:', error);
          }
        }}
      />

      <SavedOrdersModal
        isOpen={showSavedOrders}
        onClose={() => setShowSavedOrders(false)}
        savedOrders={orders}
        onDeleteOrder={onDeleteOrder}
      />
    </>
  );
};