import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, MapPin } from 'lucide-react';
import { Destination } from '@/types';
import { ModalTransition } from './transitions/ModalTransition';

interface DestinationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinations: Destination[];
  onCreateDestination: (name: string) => Promise<Destination>;
  onDeleteDestination: (id: string) => Promise<void>;
}

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
        <div className="flex items-center gap-2 mb-6">
          <MapPin className="w-6 h-6" />
          <h2 className="text-2xl font-semibold">Manage Destinations</h2>
        </div>

        {localError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {localError}
          </div>
        )}

        {/* Add new */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Add Destination</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              placeholder="Destination name"
              className="flex-1 p-2 border border-gray-300 rounded-md uppercase placeholder:normal-case placeholder:text-gray-400"
              maxLength={64}
            />
            <button
              onClick={handleCreate}
              disabled={!canAdd}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-md disabled:bg-gray-300 hover:bg-gray-800"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
          {isDuplicate && (
            <p className="mt-1 text-xs text-red-600">
              "{trimmedUpper}" already exists.
            </p>
          )}
        </div>

        {/* List */}
        <div className="mb-2">
          <h3 className="text-lg font-medium mb-2">Current Destinations</h3>
          {destinations.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              No destinations yet. Add one above to get started.
            </p>
          ) : (
            <div className="max-h-[320px] overflow-y-auto scrollbar-hide">
              <div className="flex flex-col gap-2 pr-1">
                {destinations.map(dest => (
                  <motion.div
                    key={dest.id}
                    layout
                    className="flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{dest.name}</span>
                    </div>
                    <button
                      className="p-1 text-red-500 hover:text-red-600"
                      onClick={() => setToDelete(dest)}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Delete confirmation overlay */}
        {toDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold mb-4">Delete Destination</h3>
              <p className="mb-2">
                Are you sure you want to delete "{toDelete.name}"?
              </p>
              <p className="mb-6 text-sm text-gray-500">
                Existing orders already using this destination are not affected.
              </p>
              <div className="flex gap-3">
                <button
                  className="flex-1 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  onClick={() => setToDelete(null)}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                  onClick={handleConfirmDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalTransition>
  );
};
