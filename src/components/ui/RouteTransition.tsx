import React from 'react';
import { motion } from 'framer-motion';

interface RouteTransitionProps {
  children: React.ReactNode;
  /** The unique key for this transition — typically the current route pathname */
  routeKey: string;
}

const variants = {
  initial: { opacity: 0, y: 14, filter: 'blur(2px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -10, filter: 'blur(2px)' },
};

/**
 * Wraps page content in a smooth enter/exit animation.
 * Use inside layouts around <Outlet /> to animate route changes.
 */
export const RouteTransition: React.FC<RouteTransitionProps> = ({ children, routeKey }) => {
  return (
    <motion.div
      key={routeKey}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex-1 flex flex-col"
    >
      {children}
    </motion.div>
  );
};

export default RouteTransition;
