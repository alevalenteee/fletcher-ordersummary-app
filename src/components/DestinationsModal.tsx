import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, MapPin } from 'lucide-react';
import { Destination } from '@/types';
import { ModalTransition } from './transitions/ModalTransition';
import { Button } from './ui/Button';

interface DestinationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinations: Destination[];
  onCreateDestination: (name: string) => Promise<Destination>;
  onDeleteDestination: (id: string) => Promise<void>;
}

const inputClasses = 'w-full h-10 px-3 border border-neutral-200 rounded-lg bg-white text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10';

export const DestinationsModal: React.FC<DestinationsModalProps> = ({
  isOpen,
  onClose,
  destinations,
  onCreateDestination,
  onDeleteDestination
}) => {
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Destination | null>(null);

  const trimmedUpper = newName.trim().toUpperCase();
  const isDuplicate = trimmedUpper.length > 0 && destinations.some(d => d.name === trimmedUpper);
  const canAdd = trimmedUpper.length > 0 && !isDuplicate && !isSaving;

  const handleCreate = async () => {
    if (!canAdd) return;

    try {
      setIsSaving(true);
      setLocalError(null);
      await onCreateDestination(trimmedUpper);
      setNewName('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add destination';
      setLocalError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!toDelete) return;
    try {
      setLocalError(null);
      await onDeleteDestination(toDelete.id);
      setToDelete(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete destination';
      setLocalError(message);
    }
  };

  return (
    <ModalTransition isOpen={isOpen} onClose={onClose} maxWidth="600px">
      <div className="p-6 pt-4 md:pt-6">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="p-1.5 rounded-md bg-neutral-100 text-neutral-600">
            <MapPin className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Manage destinations</h2>
        </div>

        {localError && (
          <div className="mb-4 px-3.5 py-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {localError}
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Add destination</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              placeholder="Destination name"
              className={`${inputClasses} uppercase placeholder:normal-case`}
              maxLength={64}
            />
            <Button
              onClick={handleCreate}
              disabled={!canAdd}
              className="flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>
          {isDuplicate && (
            <p className="mt-1.5 text-xs text-red-600">
              "{trimmedUpper}" already exists.
            </p>
          )}
        </div>

        <div className="mb-2">
          <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Current destinations</h3>
          {destinations.length === 0 ? (
            <p className="text-sm text-neutral-500 py-6 text-center">
              No destinations yet. Add one above to get started.
            </p>
          ) : (
            <div className="max-h-[320px] overflow-y-auto scrollbar-hide">
              <div className="flex flex-col gap-1.5 pr-1">
                {destinations.map(dest => (
                  <motion.div
                    key={dest.id}
                    layout
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-neutral-200/70 bg-white hover:bg-neutral-50/60 hover:border-neutral-300 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                      <span className="text-sm font-medium text-neutral-900">{dest.name}</span>
                    </div>
                    <button
                      className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      onClick={() => setToDelete(dest)}
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {toDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-card shadow-card-hover p-6 max-w-md w-full">
              <h3 className="text-base font-semibold tracking-tight text-neutral-900 mb-2">Delete destination</h3>
              <p className="text-sm text-neutral-600 mb-1.5">
                Are you sure you want to delete <strong className="text-neutral-900">"{toDelete.name}"</strong>?
              </p>
              <p className="text-xs text-neutral-500 mb-6">
                Existing orders already using this destination are not affected.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setToDelete(null)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleConfirmDelete}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalTransition>
  );
};
