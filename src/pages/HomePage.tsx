import React from 'react';
import { FileUpload } from '@/components/FileUpload';
import { OrderForm } from '@/components/OrderForm';
import { OrdersList } from '@/components/OrdersList';
import { PDFAnalyzer } from '@/components/PDFAnalyzer';
import { Destination, Location, Order, OrderProduct, Product, Profile, AutoAssignStockWarning } from '@/types';
import { InventoryUploadCard } from '@/components/inventory';
import type { ParsedInventoryRow } from '@/utils/inventoryCsv';
import { LoadingModal } from '@/components/ui/LoadingModal';
import { ProfileSelector } from '@/components/ProfileSelector';
import { ProductCatalogueModal } from '@/components/product-catalogue';
import { seedCatalogueRowFromOrderProduct } from '@/utils/catalogue';

// Merge a "fresh" list of just-saved orders into a baseline orders array,
// replacing same-id rows and appending genuinely new ones. Used to hand
// auto-assign a complete list before React has committed our `setOrders`.
function mergeOrdersWithFresh(baseline: Order[], fresh: Order[]): Order[] {
  if (fresh.length === 0) return baseline;
  const byId = new Map(baseline.filter(o => !!o.id).map(o => [o.id as string, o]));
  for (const o of fresh) {
    if (o.id) byId.set(o.id, o);
  }
  const idless = baseline.filter(o => !o.id);
  return [...byId.values(), ...idless];
}

interface HomePageProps {
  productData: Product[];
  onDataLoaded: (data: any[]) => void;
  onSaveDefault: (data: any[]) => Promise<void>;
  onOrderSubmit: (order: Order) => Promise<Order | null>;
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
  onUpdateDestinationColor?: (id: string, color: string | null) => Promise<void>;
  locations?: Location[];
  getLocationsFor?: (orderId: string | undefined) => Record<number, string[]>;
  onSubmitOrderLocations?: (orderId: string, draft: Record<number, string[]>) => void;
  onToggleMustGo?: (orderIndex: number, productIndex: number) => Promise<void> | void;
  inventoryRowCount?: number;
  inventoryUploadedAt?: string | null;
  inventoryLoading?: boolean;
  inventoryError?: string | null;
  onReplaceInventory?: (rows: ParsedInventoryRow[]) => Promise<void>;
  onClearInventory?: () => Promise<void>;
  onRunAutoAssign?: (orders?: Order[]) => void;
  stockWarnings?: AutoAssignStockWarning[];
  onDismissStockWarnings?: () => void;
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
  onUpdateDestinationColor,
  locations = [],
  getLocationsFor = () => ({}),
  onSubmitOrderLocations = () => {},
  onToggleMustGo,
  inventoryRowCount = 0,
  inventoryUploadedAt = null,
  inventoryLoading = false,
  inventoryError = null,
  onReplaceInventory = async () => {},
  onClearInventory = async () => {},
  onRunAutoAssign,
  stockWarnings = [],
  onDismissStockWarnings = () => {},
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Catalogue modal lives here (rather than inside FileUpload) so the
  // "Add to database" action on unknown order lines can open it too, with
  // the relevant row prefilled. The prefill is cleared on close so a
  // subsequent plain "Edit catalogue" click doesn't resurrect stale seed
  // data.
  const [catalogueOpen, setCatalogueOpen] = React.useState(false);
  const [catalogueSeed, setCatalogueSeed] = React.useState<Partial<Product> | undefined>(undefined);
  const [catalogueStatus, setCatalogueStatus] = React.useState<
    { type: 'success' | 'error'; message: string } | null
  >(null);

  const openCatalogue = React.useCallback((seed?: Partial<Product>) => {
    setCatalogueStatus(null);
    setCatalogueSeed(seed);
    setCatalogueOpen(true);
  }, []);

  const closeCatalogue = React.useCallback(() => {
    setCatalogueOpen(false);
    setCatalogueSeed(undefined);
  }, []);

  const handleAddProductToCatalogue = React.useCallback(
    (orderProduct: OrderProduct) => {
      openCatalogue(seedCatalogueRowFromOrderProduct(orderProduct));
    },
    [openCatalogue]
  );

  const handleReplaceInventory = React.useCallback(
    async (rows: ParsedInventoryRow[]) => {
      await onReplaceInventory(rows);
      onRunAutoAssign?.();
    },
    [onReplaceInventory, onRunAutoAssign]
  );

  const handleClearInventory = React.useCallback(async () => {
    await onClearInventory();
    onRunAutoAssign?.();
  }, [onClearInventory, onRunAutoAssign]);

  const handleSaveCatalogue = React.useCallback(
    async (next: Product[]) => {
      try {
        await Promise.resolve(onSaveDefault(next));
        onDataLoaded(next);
        setCatalogueStatus({
          type: 'success',
          message: `Saved ${next.length} product${next.length === 1 ? '' : 's'}`,
        });
      } catch (err) {
        setCatalogueStatus({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to save catalogue',
        });
        throw err;
      }
    },
    [onDataLoaded, onSaveDefault]
  );

  // Track submitting state for orders. We merge the freshly-saved order into
  // the orders snapshot from props before kicking off auto-assign — React
  // hasn't committed the new state yet when this resolves, so the parent's
  // ref-backed orders list would otherwise still be stale.
  const handleOrderSubmitWithLoading = async (order: Order) => {
    setIsSubmitting(true);
    try {
      const saved = await onOrderSubmit(order);
      const next = mergeOrdersWithFresh(orders, saved ? [saved] : []);
      onRunAutoAssign?.(next);
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
        productData={productData}
        onOpenCatalogue={openCatalogue}
        status={catalogueStatus}
        className="md:block"
      />

      <InventoryUploadCard
        rowCount={inventoryRowCount}
        uploadedAt={inventoryUploadedAt}
        loading={inventoryLoading}
        error={inventoryError}
        replaceInventory={handleReplaceInventory}
        clearInventory={handleClearInventory}
        className="md:block"
      />
      
      <PDFAnalyzer
        productData={productData}
        destinations={destinations}
        onOrdersAnalyzed={async (analyzedOrders) => {
          setIsSubmitting(true);
          // Collect the persisted orders so we can hand auto-assign the
          // complete, up-to-date list explicitly. Relying on the parent's
          // `ordersRef` here drops new orders because React batches the
          // setOrders calls and hasn't committed by the time we run.
          const inserted: Order[] = [];
          try {
            for (const order of analyzedOrders) {
              try {
                const saved = await onOrderSubmit(order);
                if (saved?.id) inserted.push(saved);
              } catch (error) {
                console.error('Error submitting order:', error);
              }
            }
          } finally {
            setIsSubmitting(false);
            const next = mergeOrdersWithFresh(orders, inserted);
            onRunAutoAssign?.(next);
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
        onUpdateDestinationColor={onUpdateDestinationColor}
      />
      
      <OrdersList
        orders={orders}
        productData={productData}
        onEditOrder={onEditOrder}
        onDeleteOrder={onDeleteOrder}
        destinations={destinations}
        locations={locations}
        getLocationsFor={getLocationsFor}
        onSubmitOrderLocations={onSubmitOrderLocations}
        onToggleMustGo={onToggleMustGo}
        onAddProductToCatalogue={handleAddProductToCatalogue}
        hasInventory={inventoryRowCount > 0}
        onRunAutoAssign={onRunAutoAssign}
        stockWarnings={stockWarnings}
        onDismissStockWarnings={onDismissStockWarnings}
      />

      <ProductCatalogueModal
        isOpen={catalogueOpen}
        onClose={closeCatalogue}
        products={productData}
        onSave={handleSaveCatalogue}
        initialNewRow={catalogueSeed}
      />
    </>
  );
};