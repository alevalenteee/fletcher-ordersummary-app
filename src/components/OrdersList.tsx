import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Location, Order, Product } from '@/types';
import { OrderTable } from './OrderTable';
import { Button } from './ui/Button';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { FadeTransition } from './transitions/FadeTransition';
import { LoadingModal } from './ui/LoadingModal';
import { Printer, Edit2, Trash2, Trash, Download, Package, MapPin } from 'lucide-react';
import { downloadExcel } from '@/utils/export';
import { sortOrdersByTime } from '@/utils/time';
import { formatTrailerInfo } from '@/lib/utils';
import { LocationsModal } from './locations';

interface OrdersListProps {
  orders: Order[];
  productData: Product[];
  onEditOrder: (index: number) => void;
  onDeleteOrder: (index: number) => void;
  locations?: Location[];
  getLocationsFor?: (orderId: string | undefined) => Record<number, string[]>;
  onSubmitOrderLocations?: (orderId: string, draft: Record<number, string[]>) => void;
}

export const OrdersList: React.FC<OrdersListProps> = ({
  orders,
  productData,
  onEditOrder,
  onDeleteOrder,
  locations = [],
  getLocationsFor = () => ({}),
  onSubmitOrderLocations = () => {}
}) => {
  const navigate = useNavigate();
  const [deletingIndex, setDeletingIndex] = React.useState<number | null>(null);
  const [showDeleteAllConfirmation, setShowDeleteAllConfirmation] = React.useState(false);
  const [isDeletingAll, setIsDeletingAll] = React.useState(false);
  const [updatingOrder, setUpdatingOrder] = React.useState<number | null>(null);
  const [showLocationsModal, setShowLocationsModal] = React.useState(false);

  // Sort orders by time
  const sortedOrders = React.useMemo(() => {
    // Use the proper time sorting function that handles shift patterns
    const timeSortedOrders = sortOrdersByTime(orders);
    // Create an array with their original indices for tracking
    return timeSortedOrders.map((order) => ({
      order,
      originalIndex: orders.findIndex(o => o === order)
    }));
  }, [orders]);

  const handleDelete = (sortedIndex: number) => {
    setDeletingIndex(sortedIndex);
    // Actual deletion happens after animation
  };

  const handleDeleteAll = async () => {
    try {
      setIsDeletingAll(true);
      setShowDeleteAllConfirmation(false);
      
      // Delete orders one by one to trigger animations
      for (let i = orders.length - 1; i >= 0; i--) {
        setDeletingIndex(i);
        await new Promise(resolve => setTimeout(resolve, 300)); // Wait for animation
        await onDeleteOrder(i);
      }
    } catch (error) {
      console.error('Error deleting all orders:', error);
    } finally {
      setDeletingIndex(null);
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

      {sortedOrders.map(({ order, originalIndex }, sortedIndex) => (
        <FadeTransition
          key={sortedIndex}
          in={deletingIndex !== sortedIndex}
          onExited={() => {
            onDeleteOrder(originalIndex);
            setDeletingIndex(null);
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.28,
              ease: [0.22, 1, 0.36, 1],
              delay: Math.min(sortedIndex * 0.03, 0.18),
            }}
            className={`group bg-white p-6 rounded-card border border-neutral-200/70 shadow-card transition-shadow duration-200 hover:shadow-card-hover ${
              deletingIndex === sortedIndex ? 'opacity-50' : ''
            }`}
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
                  onClick={() => handleDelete(sortedIndex)}
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
            />
          </motion.div>
        </FadeTransition>
      ))}

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