import React from 'react';
import { FileUpload } from '@/components/FileUpload';
import { OrderForm } from '@/components/OrderForm';
import { OrdersList } from '@/components/OrdersList';
import { PDFAnalyzer } from '@/components/PDFAnalyzer';
import { Destination, Location, Order, Product, Profile } from '@/types';
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
  destinations?: Destination[];
  onCreateDestination?: (name: string) => Promise<Destination>;
  onDeleteDestination?: (id: string) => Promise<void>;
  locations?: Location[];
  getLocationsFor?: (orderId: string | undefined) => Record<number, string>;
  onSubmitOrderLocations?: (orderId: string, draft: Record<number, string>) => void;
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
  onDeleteProfile = () => {},
  destinations = [],
  onCreateDestination = async () => { throw new Error('onCreateDestination not provided'); },
  onDeleteDestination = async () => {},
  locations = [],
  getLocationsFor = () => ({}),
  onSubmitOrderLocations = () => {}
}) => {
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
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-neutral-200 border-t-neutral-900 mx-auto"></div>
          <p className="mt-4 text-sm text-neutral-500">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-card mb-6 text-sm">
        {error}
      </div>
    );
  }

  return (
    <>
      <LoadingModal isOpen={isSubmitting} message="Updating Orders..." />

      {currentProfile && (
        <div className="mb-6 flex justify-center sm:justify-start">
          <ProfileSelector
            profiles={profiles}
            currentProfile={currentProfile}
            onSwitchProfile={onSwitchProfile}
            onCreateProfile={onCreateProfile}
            onUpdateProfile={onUpdateProfile}
            onDeleteProfile={onDeleteProfile}
          />
        </div>
      )}

      <FileUpload 
        onDataLoaded={onDataLoaded}
        onSaveDefault={onSaveDefault}
        productData={productData}
        className="md:block"
      />
      
      <PDFAnalyzer
        productData={productData}
        destinations={destinations}
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
        destinations={destinations}
        onCreateDestination={onCreateDestination}
        onDeleteDestination={onDeleteDestination}
      />
      
      <OrdersList
        orders={orders}
        productData={productData}
        onEditOrder={onEditOrder}
        onDeleteOrder={onDeleteOrder}
        locations={locations}
        getLocationsFor={getLocationsFor}
        onSubmitOrderLocations={onSubmitOrderLocations}
      />
    </>
  );
};