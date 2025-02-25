import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
  location: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children, location }) => {
  // Track navigation history to determine direction
  const navigationHistoryRef = useRef<string[]>([]);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  useEffect(() => {
    // Get current navigation history
    const history = navigationHistoryRef.current;
    
    // Don't update for the initial render
    if (history.length > 0) {
      const currentIndex = history.indexOf(location);
      
      // If the location exists in our history and is not the last item,
      // we're navigating backward
      if (currentIndex !== -1 && currentIndex < history.length - 1) {
        setDirection('backward');
        // Remove all entries after the current location
        navigationHistoryRef.current = history.slice(0, currentIndex + 1);
      } else {
        // We're navigating to a new location
        setDirection('forward');
        navigationHistoryRef.current = [...history, location];
      }
    } else {
      // First navigation, add to history
      navigationHistoryRef.current = [location];
    }
  }, [location]);

  // Define animation variants based on navigation direction
  const variants = {
    initial: {
      x: direction === 'forward' ? '-100%' : '100%',
      opacity: 0
    },
    animate: {
      x: 0,
      opacity: 1
    },
    exit: {
      x: direction === 'forward' ? '100%' : '-100%',
      opacity: 0
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={variants}
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 20,
        }}
        className="min-h-screen"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};