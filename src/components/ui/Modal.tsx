import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

        <div className={cn(
          "relative bg-white rounded-card shadow-card-hover border border-neutral-200/70 max-w-lg w-full mx-auto p-6",
          className
        )}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold tracking-tight text-neutral-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};