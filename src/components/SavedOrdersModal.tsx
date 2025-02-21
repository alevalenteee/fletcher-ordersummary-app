import React from 'react';
import { Order } from '@/types';
import { ModalTransition } from './transitions/ModalTransition';
import { X, Truck, Trash2, InboxIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

interface SavedOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedOrders: Order[];
  onDeleteOrder: (index: number) => Promise<void>;
}

export const SavedOrdersModal: React.FC<SavedOrdersModalProps> = ({
  isOpen,
  onClose,
  savedOrders,
  onDeleteOrder
}) => {
  const navigate = useNavigate();
  const [deletingIndex, setDeletingIndex] = React.useState<number | null>(null);

  if (!isOpen) return null;

  const handleDelete = async (index: number) => {
    try {
      setDeletingIndex(index);
      await onDeleteOrder(index);
    } finally {
      setDeletingIndex(null);
    }
  };

  const handleStartLoading = () => {
    onClose();
    navigate('/live-loading');
  };

  const handleOrderClick = (order: Order) => {
    onClose();
    navigate('/live-loading', { state: { selectedOrder: order } });
  };

  return (
    <ModalTransition isOpen={isOpen} onClose={onClose}>
      <div className="p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Saved Orders</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <AnimatePresence mode="wait">
          {savedOrders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
              >
                <InboxIcon className="w-16 h-16 text-gray-400 mb-4" />
              </motion.div>
              <motion.h3
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xl font-medium text-gray-900 mb-2"
              >
                No Orders Saved
              </motion.h3>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-gray-500"
              >
                Add an order to get started with order management
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {savedOrders.map((order, index) => (
                <div
                  key={order.id || index}
                  onClick={() => handleOrderClick(order)}
                  className="border rounded-lg p-4 space-y-2 hover:border-black transition-colors cursor-pointer relative group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium">{order.destination}</h3>
                      <p className="text-gray-600">{order.time}</p>
                      {order.manifestNumber && (
                        <p className="text-sm text-gray-500">
                          Manifest: {order.manifestNumber}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(index);
                      }}
                      disabled={deletingIndex === index}
                      className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                  
                  <div className="mt-2">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Products:</h4>
                    <ul className="space-y-1">
                      {order.products.map((product, productIndex) => (
                        <li key={productIndex} className="text-sm text-gray-600">
                          {product.productCode} - {product.packsOrdered} packs
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleStartLoading}
                  className="flex items-center gap-2"
                >
                  <Truck className="w-5 h-5" />
                  Live Loading
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ModalTransition>
  );
};