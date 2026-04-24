import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Destination, Location, Order, OrderProduct, Product } from '@/types';
import { OrderTable } from './OrderTable';
import { TodayAtAGlance } from './TodayAtAGlance';
import { Button } from './ui/Button';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { LoadingModal } from './ui/LoadingModal';
import { Printer, Edit2, Trash2, Trash, Download, Package, MapPin } from 'lucide-react';
import { downloadExcel } from '@/utils/export';
import { sortOrdersByTime } from '@/utils/time';
import { formatTrailerInfo } from '@/lib/utils';
import { getDestinationAccent } from '@/utils/destinationColors';
import { LocationsModal } from './locations';

interface OrdersListProps {
  orders: Order[];
  productData: Product[];
  onEditOrder: (index: number) => void;
  onDeleteOrder: (index: number) => void;
  destinations?: Destination[];
  locations?: Location[];
  getLocationsFor?: (orderId: string | undefined) => Record<number, string[]>;
  onSubmitOrderLocations?: (orderId: string, draft: Record<number, string[]>) => void;
  onToggleMustGo?: (orderIndex: number, productIndex: number) => Promise<void> | void;
  // Opens the Product catalogue modal with a prefilled new row seeded from
  // this order line. Surfaced on unknown / manually-described rows via a
  // hover-reveal "Add to database" button in TableRow.
  onAddProductToCatalogue?: (product: OrderProduct) => void;
}

export const OrdersList: React.FC<OrdersListProps> = ({
  orders,
  productData,
  onEditOrder,
  onDeleteOrder,
  destinations = [],
  locations = [],
  getLocationsFor = () => ({}),
  onSubmitOrderLocations = () => {},
  onToggleMustGo,
  onAddProductToCatalogue
}) => {
  const navigate = useNavigate();
  const [showDeleteAllConfirmation, setShowDeleteAllConfirmation] = React.useState(false);
  const [isDeletingAll, setIsDeletingAll] = React.useState(false);
  const [updatingOrder, setUpdatingOrder] = React.useState<number | null>(null);
  const [showLocationsModal, setShowLocationsModal] = React.useState(false);
  // Track orders that have been clicked for deletion but whose backend call
  // hasn't returned yet. We hide them from the list immediately so the exit
  // animation starts on click rather than after the Supabase round-trip.
  const [pendingDeleteIds, setPendingDeleteIds] = React.useState<Set<string>>(new Set());

  // Sort orders by time. We filter out orders that are mid-delete so they
  // animate out the moment the user clicks delete — AnimatePresence picks up
  // the removal from this array and runs the exit transition.
  const sortedOrders = React.useMemo(() => {
    const timeSortedOrders = sortOrdersByTime(orders);
    return timeSortedOrders
      .map((order) => ({
        order,
        originalIndex: orders.findIndex(o => o === order),
      }))
      .filter(({ order }) => !(order.id && pendingDeleteIds.has(order.id)));
  }, [orders, pendingDeleteIds]);

  const handleDelete = async (originalIndex: number) => {
    const target = orders[originalIndex];
    if (target?.id) {
      setPendingDeleteIds(prev => {
        const next = new Set(prev);
        next.add(target.id as string);
        return next;
      });
    }
    try {
      await onDeleteOrder(originalIndex);
    } finally {
      if (target?.id) {
        setPendingDeleteIds(prev => {
          if (!prev.has(target.id as string)) return prev;
          const next = new Set(prev);
          next.delete(target.id as string);
          return next;
        });
      }
    }
  };

  const handleDeleteAll = async () => {
    try {
      setIsDeletingAll(true);
      setShowDeleteAllConfirmation(false);

      // Walk from the end so indices stay valid as items are removed. A small
      // gap between deletions produces a pleasant cascade instead of every
      // card vanishing simultaneously.
      for (let i = orders.length - 1; i >= 0; i--) {
        await onDeleteOrder(i);
        await new Promise(resolve => setTimeout(resolve, 90));
      }
    } catch (error) {
      console.error('Error deleting all orders:', error);
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleUpdateProduct = async (sortedIndex: number) => {
    try {
      setUpdatingOrder(sortedIndex);
      const originalIndex = sortedOrders[sortedIndex].originalIndex;
      onEditOrder(originalIndex);
      // Scroll to the top of the page smoothly
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleEdit = (originalIndex: number) => {
    onEditOrder(originalIndex);
    // Scroll to the top of the page smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-4 mt-10">
      <LoadingModal
        isOpen={updatingOrder !== null || isDeletingAll}
        message={isDeletingAll ? "Deleting all orders..." : "Updating order..."}
      />

      {orders.length > 0 ? (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-neutral-100 text-neutral-600">
              <Package className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold tracking-tight text-neutral-900">
              Orders <span className="text-neutral-400 font-normal">({orders.length})</span>
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              onClick={() => setShowDeleteAllConfirmation(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 w-full sm:w-auto justify-center text-red-600 hover:text-red-700 hover:border-red-200 hover:bg-red-50"
            >
              <Trash className="w-3.5 h-3.5" />
              <span>Delete all</span>
            </Button>
            <Button
              onClick={() => downloadExcel(sortedOrders.map(o => o.order), productData)}
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 w-full sm:w-auto justify-center"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </Button>
            <Button
              onClick={() => setShowLocationsModal(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 w-full sm:w-auto justify-center"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Add locations</span>
            </Button>
            <Button
              onClick={() => navigate('/print')}
              size="sm"
              className="flex items-center gap-1.5 w-full sm:w-auto justify-center"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print orders</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center justify-center py-16 px-6 text-center rounded-card border border-dashed border-neutral-200 bg-white/60">
          <div className="p-3 rounded-full bg-neutral-100 text-neutral-400 mb-4">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-900">No orders yet</h3>
          <p className="text-sm text-neutral-500 mt-1 max-w-sm">
            Drop a PDF above to extract orders automatically, or add one manually using the form.
          </p>
        </div>
      )}

      {orders.length > 0 && (
        <TodayAtAGlance
          orders={orders}
          productData={productData}
          destinations={destinations}
        />
      )}

      <AnimatePresence mode="popLayout" initial={false}>
        {sortedOrders.map(({ order, originalIndex }, sortedIndex) => {
          // Stable key: prefer the Supabase id so AnimatePresence can track
          // the same card across re-renders when the array shifts. Falling
          // back to a composite is fine for freshly-analysed orders that
          // haven't been persisted yet.
          const key = order.id ?? `fallback-${order.destination}-${order.time}-${order.manifestNumber ?? ''}`;
          const accent = getDestinationAccent(order.destination, destinations);
          return (
            <motion.div
              key={key}
              layout
              initial={{ opacity: 0, y: 14, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{
                opacity: 0,
                y: -6,
                scale: 0.97,
                transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
              }}
              transition={{
                duration: 0.32,
                ease: [0.22, 1, 0.36, 1],
                delay: Math.min(sortedIndex * 0.04, 0.2),
                layout: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
              }}
              style={{ borderLeftColor: accent.bar }}
              className="group bg-white p-6 rounded-card border border-neutral-200/70 border-l-[3px] shadow-card transition-shadow duration-200 hover:shadow-card-hover"
            >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
              <div className="space-y-1 w-full sm:w-auto min-w-0">
                <h3 className="text-lg font-semibold tracking-tight text-neutral-900 truncate">
                  {order.destination}
                  <span className="text-neutral-400 font-normal"> · </span>
                  <span className="tabular-nums">{order.time}</span>
                </h3>
                {(order.manifestNumber || order.transportCompany || order.trailerType || order.trailerSize) && (
                  <div className="text-xs text-neutral-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    {order.manifestNumber && (
                      <span>
                        <span className="text-neutral-400">Manifest</span> <span className="font-medium text-neutral-700">{order.manifestNumber}</span>
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
                      <span className="font-medium text-neutral-700">{formatTrailerInfo(order.trailerType, order.trailerSize)}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-1.5 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(originalIndex)}
                  className="flex items-center gap-1.5 flex-1 sm:flex-initial justify-center"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(originalIndex)}
                  className="flex items-center gap-1.5 flex-1 sm:flex-initial justify-center text-red-600 hover:text-red-700 hover:border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </Button>
              </div>
            </div>
            <OrderTable
              order={order}
              productData={productData}
              onUpdateProduct={() => handleUpdateProduct(sortedIndex)}
              locations={locations}
              locationsByIndex={getLocationsFor(order.id)}
              onToggleMustGo={
                onToggleMustGo
                  ? (productIndex) => onToggleMustGo(originalIndex, productIndex)
                  : undefined
              }
              onAddProductToCatalogue={onAddProductToCatalogue}
            />
          </motion.div>
          );
        })}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={showDeleteAllConfirmation}
        onClose={() => setShowDeleteAllConfirmation(false)}
        onConfirm={handleDeleteAll}
        title="Delete All Orders"
        message="Are you sure you want to delete all orders? This action cannot be undone."
        confirmText="Delete All"
        cancelText="Cancel"
      />

      <LocationsModal
        isOpen={showLocationsModal}
        onClose={() => setShowLocationsModal(false)}
        orders={orders}
        productData={productData}
        locations={locations}
        getLocationsFor={getLocationsFor}
        onSubmit={onSubmitOrderLocations}
      />
    </div>
  );
};