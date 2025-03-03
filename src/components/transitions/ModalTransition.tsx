import React from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalTransitionProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose?: () => void;
  maxWidth?: string;
}

const modalVariants = {
  hidden: {
    opacity: 0,
    y: '100%',
    transition: {
      duration: 0.3,
      ease: 'easeInOut'
    }
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300
    }
  },
  exit: {
    opacity: 0,
    y: '100%',
    transition: {
      duration: 0.35,
      ease: [0.32, 0, 0.67, 0]  // Custom easing for smoother exit
    }
  }
};

const overlayVariants = {
  hidden: { 
    opacity: 0,
    transition: {
      duration: 0.2
    }
  },
  visible: { 
    opacity: 1,
    transition: {
      duration: 0.2
    }
  },
  exit: { 
    opacity: 0,
    transition: {
      duration: 0.3,
      delay: 0.1  // Slight delay to ensure modal exits first
    }
  }
};

export const ModalTransition: React.FC<ModalTransitionProps> = ({
  children,
  isOpen,
  onClose,
  maxWidth
}) => {
  // Handle swipe down gesture
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // If the user has dragged down more than 100px, close the modal
    if (info.offset.y > 100 && onClose) {
      onClose();
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="modal-container"
          className="fixed inset-0 z-50"
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div
            key="modal-backdrop"
            variants={overlayVariants}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="modal-content"
            variants={modalVariants}
            className="fixed inset-x-0 bottom-0 pointer-events-auto flex justify-center"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.7}
            onDragEnd={handleDragEnd}
            dragDirectionLock
            dragMomentum={false}
          >
            <div 
              className="bg-white rounded-t-xl w-full md:w-auto sm:max-w-[80%] max-w-[1000px] relative"
              style={{ 
                minWidth: '320px',
                width: '100%',
                maxWidth: maxWidth || '1000px'
              }}
            >
              {/* Swipe indicator for mobile */}
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-2 mb-1 md:hidden" />
              
              {/* Close button for desktop */}
              <button 
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 hidden md:flex items-center justify-center"
                onClick={onClose}
                aria-label="Close modal"
              >
                <X size={24} />
              </button>
              
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 