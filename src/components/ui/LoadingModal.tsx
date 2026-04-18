import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingModalProps {
  isOpen: boolean;
  message?: string;
}

export const LoadingModal: React.FC<LoadingModalProps> = ({
  isOpen,
  message = 'Updating Orders...'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="bg-white px-5 py-4 rounded-card shadow-card-hover border border-neutral-200/70 flex items-center gap-3 max-w-sm mx-4">
        <div className="bg-brand-50 p-1.5 rounded-full border border-brand-100">
          <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
        </div>
        <p className="text-sm font-medium text-neutral-700">{message}</p>
      </div>
    </div>
  );
};