import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Order, Product } from '@/types';
import { OrderTable } from './OrderTable';
import { Button } from './ui/Button';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { FadeTransition } from './transitions/FadeTransition';
import { LoadingModal } from './ui/LoadingModal';
import { Printer, Edit2, Trash2, Clock, Trash, Download } from 'lucide-react';
import { sortOrdersByTime } from '@/utils/time';
import { downloadExcel } from '@/utils/export';

interface OrdersListProps {
  orders: Order[];
  productData: Product[];
  onEditOrder: (index: number) => void;
  onDeleteOrder: (index: number) => void;
  onUpdateOrder: (index: number, order: Order) => void;
}

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => 
  `${String(i).padStart(2, '0')}:00`
);

export const OrdersList: React.FC<OrdersListProps> = ({
  orders,
  productData,
  onEditOrder,
  onDeleteOrder,
  onUpdateOrder
}) => {
  const navigate = useNavigate();
  const [deletingOrderId, setDeletingOrderId] = React.useState<string | null>(null);
  const [showDeleteAllConfirmation, setShowDeleteAllConfirmation] = React.useState(false);
  const [isDeletingAll, setIsDeletingAll] = React.useState(false);
  const [updatingOrder, setUpdatingOrder] = React.useState<number | null>(null);
  const [timeDropdownIndex, setTimeDropdownIndex] = React.useState<string | null>(null);

  // Sort orders by time
  const sortedOrders = React.useMemo(() => {
    return sortOrdersByTime(orders);
  }, [orders]);

  // Find the original index of an order in the unsorted array
  const findOriginalIndex = (orderId: string): number => {
    return orders.findIndex(order => order.id === orderId);
  };

  const handleDelete = (order: Order) => {
    if (!order.id) return;
    setDeletingOrderId(order.id);
    // Actual deletion happens after animation
  };

  const handleDeleteAll = async () => {
    try {
      setIsDeletingAll(true);
      setShowDeleteAllConfirmation(false);
      
      // Delete orders one by one to trigger animations
      for (let i = orders.length - 1; i >= 0; i--) {
        if (orders[i].id) {
          setDeletingOrderId(orders[i].id || null);
          await new Promise(resolve => setTimeout(resolve, 300)); // Wait for animation
          await onDeleteOrder(i);
        }
      }
    } catch (error) {
      console.error('Error deleting all orders:', error);
    } finally {
      setDeletingOrderId(null);
      setIsDeletingAll(false);
    }
  };

  const handleTimeChange = async (order: Order, newTime: string) => {
    if (!order.id) return;
    const originalIndex = findOriginalIndex(order.id);
    if (originalIndex === -1) return;
    
    try {
      setUpdatingOrder(originalIndex);
      const updatedOrder = {
        ...order,
        time: newTime
      };
      await onUpdateOrder(originalIndex, updatedOrder);
    } finally {
      setUpdatingOrder(null);
      setTimeDropdownIndex(null);
    }
  };

  const handleUpdateProduct = async (order: Order) => {
    if (!order.id) return;
    const originalIndex = findOriginalIndex(order.id);
    if (originalIndex === -1) return;
    
    try {
      setUpdatingOrder(originalIndex);
      onEditOrder(originalIndex);
    } finally {
      setUpdatingOrder(null);
    }
  };

  return (
    <div className="space-y-6 mt-12">
      <LoadingModal 
        isOpen={updatingOrder !== null || isDeletingAll}
        message={isDeletingAll ? "Deleting all orders..." : "Updating order..."}
      />
      
      {orders.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h2 className="text-xl font-semibold">Orders</h2>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              onClick={() => setShowDeleteAllConfirmation(true)}
              variant="danger"
              className="flex items-center space-x-2 w-full sm:w-auto justify-center"
            >
              <Trash className="w-5 h-5" />
              <span>Delete All</span>
            </Button>
            <Button
              onClick={() => downloadExcel(sortedOrders, productData)}
              className="flex items-center space-x-2 w-full sm:w-auto justify-center"
            >
              <Download className="w-5 h-5" />
              <span>Export Excel</span>
            </Button>
            <Button
              onClick={() => navigate('/print')}
              className="flex items-center space-x-2 w-full sm:w-auto justify-center"
            >
              <Printer className="w-5 h-5" />
              <span>Print Orders</span>
            </Button>
          </div>
        </div>
      )}

      {sortedOrders.map((order) => (
        <FadeTransition
          key={order.id || `temp-${order.destination}-${order.time}`}
          in={deletingOrderId !== order.id}
          onExited={() => {
            if (order.id) {
              const originalIndex = findOriginalIndex(order.id);
              if (originalIndex !== -1) {
                onDeleteOrder(originalIndex);
              }
            }
            setDeletingOrderId(null);
          }}
        >
          <div className={`bg-white p-6 rounded-lg shadow-sm transition-all duration-300 ${
            deletingOrderId === order.id ? 'opacity-50' : ''
          }`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">
                  {order.destination} - 
                  <button
                    onClick={() => order.id && setTimeDropdownIndex(order.id)}
                    className="inline-flex items-center gap-1 hover:text-blue-600 focus:outline-none"
                  >
                    <Clock className="w-4 h-4" />
                    {order.time}
                  </button>
                </h3>
                {order.id && timeDropdownIndex === order.id && (
                  <div className="relative">
                    <div className="absolute z-10 mt-1 w-36 bg-white border border-gray-200 rounded-md shadow-lg">
                      <div className="max-h-48 overflow-y-auto py-1">
                        {TIME_SLOTS.map((time) => (
                          <button
                            key={time}
                            onClick={() => handleTimeChange(order, time)}
                            className={`w-full px-4 py-2 text-left hover:bg-gray-100 ${
                              time === order.time ? 'bg-gray-50 font-medium' : ''
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {order.manifestNumber && (
                  <p className="text-base text-gray-700 font-medium">
                    Manifest Number: {order.manifestNumber}
                  </p>
                )}
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUpdateProduct(order)}
                  className="flex items-center space-x-2 flex-1 sm:flex-initial justify-center"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit</span>
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(order)}
                  className="flex items-center space-x-2 flex-1 sm:flex-initial justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </Button>
              </div>
            </div>
            <OrderTable 
              order={order} 
              productData={productData}
              onUpdateProduct={() => handleUpdateProduct(order)}
            />
          </div>
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
    </div>
  );
};