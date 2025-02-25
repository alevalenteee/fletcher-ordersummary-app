import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  maxWidth = "600px"
}) => {
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
          >
            <div 
              className="bg-white rounded-t-xl w-full md:w-auto sm:max-w-[80%] max-w-[1000px]"
              style={{ 
                minWidth: '320px',
                width: '100%'
              }}
            >
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 