import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  const config = {
    success: {
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20'
    },
    error: {
      icon: AlertCircle,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20'
    },
    info: {
      icon: Info,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/20'
    }
  };

  const { icon: Icon, color, bg, border } = config[type];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
          className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl border ${border} ${bg} backdrop-blur-xl shadow-2xl min-w-[300px]`}
        >
          <div className={color}>
            <Icon className="h-5 w-5" />
          </div>
          <p className="flex-1 text-sm font-medium text-slate-200">{message}</p>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
