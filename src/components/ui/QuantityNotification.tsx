import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuantityNotificationProps {
  show: boolean;
  amount: number | null;
  type: 'increment' | 'decrement';
  onExited: () => void;
}

export const QuantityNotification: React.FC<QuantityNotificationProps> = ({
  show,
  amount,
  type,
  onExited
}) => {
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  React.useEffect(() => {
    if (show && amount !== null) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        onExited();
      }, 800);
    }

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [show, amount, onExited]);

  // Don't render anything if amount is null
  if (amount === null) return null;

  return (
    <AnimatePresence mode="wait">
      {show && (
        <div 
          key="notification-container"
          className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
        >
          <motion.div
            key="notification-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
            style={{ willChange: 'opacity, backdrop-filter' }}
          />
          <motion.div
            key="notification-content"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              transition: {
                duration: 0.2,
                ease: [0.2, 0, 0.2, 1]
              }
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.95,
              transition: {
                duration: 0.15,
                ease: [0.4, 0, 1, 1]
              }
            }}
            className={`flex items-center gap-3 px-8 py-4 rounded-xl shadow-2xl ${
              type === 'increment' ? 'bg-emerald-500 text-white' : 'bg-red-600 text-white'
            }`}
            style={{ willChange: 'transform, opacity' }}
          >
            <motion.div
              key="notification-icon"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                transition: { 
                  delay: 0.05,
                  duration: 0.15
                }
              }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              {type === 'increment' ? (
                <Plus className="w-8 h-8" />
              ) : (
                <Minus className="w-8 h-8" />
              )}
            </motion.div>
            <motion.span
              key="notification-text"
              initial={{ opacity: 0, x: -5 }}
              animate={{ 
                opacity: 1, 
                x: 0,
                transition: { 
                  delay: 0.05,
                  duration: 0.15
                }
              }}
              exit={{ opacity: 0, x: -5 }}
              className="font-medium text-2xl"
            >
              {Math.abs(amount)} {Math.abs(amount) === 1 ? 'unit' : 'units'}
            </motion.span>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};