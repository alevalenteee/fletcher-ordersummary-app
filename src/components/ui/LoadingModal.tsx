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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className="bg-white px-6 py-4 rounded-lg shadow-xl border border-gray-200 flex items-center gap-4 max-w-sm mx-4">
        <div className="bg-emerald-100 p-2 rounded-full">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
        <p className="text-base font-medium text-gray-700">{message}</p>
      </div>
    </div>
  );
};