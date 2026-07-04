import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import GlassCard from './GlassCard';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md'
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'max-w-md';
      case 'lg':
        return 'max-w-2xl';
      case 'xl':
        return 'max-w-4xl';
      default: // md
        return 'max-w-lg';
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className={`w-full ${getSizeClass()} z-10`}
          >
            <GlassCard hoverable={false} className="border border-white/10 shadow-2xl relative overflow-hidden bg-slate-950/90 max-h-[85vh] flex flex-col p-0">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                {title ? (
                  <h3 className="text-lg font-semibold text-white font-display tracking-wide">
                    {title}
                  </h3>
                ) : (
                  <div />
                )}
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all active:scale-95"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content body */}
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 text-slate-300">
                {children}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default Modal;
