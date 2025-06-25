import React from 'react';
import { FileUpload } from '@/components/FileUpload';
import { OrderForm } from '@/components/OrderForm';
import { OrdersList } from '@/components/OrdersList';
import { SavedOrdersModal } from '@/components/SavedOrdersModal';
import { PDFAnalyzer } from '@/components/PDFAnalyzer';
import { Order, Product, Profile } from '@/types';
import { Button } from '@/components/ui/Button';
import { Archive } from 'lucide-react';
import { LoadingModal } from '@/components/ui/LoadingModal';
import { ProfileSelector } from '@/components/ProfileSelector';

interface HomePageProps {
  productData: Product[];
  onDataLoaded: (data: any[]) => void;
  onSaveDefault: (data: any[]) => Promise<void>;
  onOrderSubmit: (order: Order) => Promise<void>;
  onEditOrder: (index: number) => void;
  onDeleteOrder: (index: number) => Promise<void>;
  editingOrder: Order | null;
  orders: Order[];
  loading?: boolean;
  error?: string | null;
  profiles?: Profile[];
  currentProfile?: Profile | null;
  onSwitchProfile?: (id: string) => void;
  onCreateProfile?: (profile: Omit<Profile, 'id' | 'created_at'>) => void;
  onUpdateProfile?: (id: string, updates: Partial<Omit<Profile, 'id' | 'created_at'>>) => void;
  onDeleteProfile?: (id: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  productData,
  onDataLoaded,
  onSaveDefault,
  onOrderSubmit,
  onEditOrder,
  onDeleteOrder,
  editingOrder,
  orders,
  loading = false,
  error = null,
  profiles = [],
  currentProfile = null,
  onSwitchProfile = () => {},
  onCreateProfile = () => {},
  onUpdateProfile = () => {},
  onDeleteProfile = () => {}
}) => {
  const [showSavedOrders, setShowSavedOrders] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Track submitting state for orders
  const handleOrderSubmitWithLoading = async (order: Order) => {
    setIsSubmitting(true);
    try {
      await onOrderSubmit(order);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
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
      
      <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="w-full order-1 sm:order-1 sm:w-auto">
            {currentProfile && (
              <ProfileSelector
                profiles={profiles}
                currentProfile={currentProfile}
                onSwitchProfile={onSwitchProfile}
                onCreateProfile={onCreateProfile}
                onUpdateProfile={onUpdateProfile}
                onDeleteProfile={onDeleteProfile}
              />
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => setShowSavedOrders(true)}
            className="flex items-center justify-center gap-2 w-full order-2 sm:order-2 sm:w-auto"
          >
            <Archive className="w-5 h-5" />
            View Orders
          </Button>
        </div>
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
          setIsSubmitting(true);
          try {
            for (const order of analyzedOrders) {
              try {
                await onOrderSubmit(order);
              } catch (error) {
                console.error('Error submitting order:', error);
              }
            }
          } finally {
            setIsSubmitting(false);
          }
        }}
      />
      
      <OrderForm
        productData={productData}
        onSubmit={handleOrderSubmitWithLoading}
        initialOrder={editingOrder}
      />
      
      <OrdersList
        orders={orders}
        productData={productData}
        onEditOrder={onEditOrder}
        onDeleteOrder={onDeleteOrder}
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