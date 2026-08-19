import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/35 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{ backdropFilter: 'blur(3px)' }}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 34, stiffness: 340 }}
          >
            <div className="bg-surface rounded-t-[26px] shadow-modal px-6 pt-3 pb-10 max-h-[85vh] overflow-y-auto">
              {/* Grab handle */}
              <div className="w-10 h-1.5 bg-border rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[19px] font-semibold text-text tracking-tight">
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="w-8 h-8 -mr-1 rounded-full bg-surface-muted flex items-center justify-center hover:bg-border/70 transition-colors"
                  aria-label="Close"
                >
                  <FiX className="w-4 h-4 text-secondary" />
                </button>
              </div>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}