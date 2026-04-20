import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, MapPin, Palette } from 'lucide-react';
import { Destination } from '@/types';
import { ModalTransition } from './transitions/ModalTransition';
import { Button } from './ui/Button';
import {
  PALETTE_SLUGS,
  PaletteSlug,
  getDestinationAccent,
  getPaletteSwatch,
} from '@/utils/destinationColors';

interface DestinationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinations: Destination[];
  onCreateDestination: (name: string) => Promise<Destination>;
  onDeleteDestination: (id: string) => Promise<void>;
  onUpdateDestinationColor?: (id: string, color: string | null) => Promise<void>;
}

const inputClasses = 'w-full h-10 px-3 border border-neutral-200 rounded-lg bg-white text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10';

export const DestinationsModal: React.FC<DestinationsModalProps> = ({
  isOpen,
  onClose,
  destinations,
  onCreateDestination,
  onDeleteDestination,
  onUpdateDestinationColor
}) => {
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Destination | null>(null);
  const [openColourFor, setOpenColourFor] = useState<string | null>(null);

  const handlePickColour = async (id: string, slug: PaletteSlug | null) => {
    if (!onUpdateDestinationColor) return;
    try {
      setLocalError(null);
      await onUpdateDestinationColor(id, slug);
      setOpenColourFor(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update colour';
      setLocalError(message);
    }
  };

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
                {destinations.map(dest => {
                  const accent = getDestinationAccent(dest.name, destinations);
                  const hasOverride =
                    typeof dest.color === 'string' &&
                    (PALETTE_SLUGS as string[]).includes(dest.color);
                  const isColourOpen = openColourFor === dest.id;
                  return (
                    <motion.div
                      key={dest.id}
                      layout
                      className="rounded-lg border border-neutral-200/70 bg-white hover:border-neutral-300 transition-colors"
                    >
                      <div className="flex items-center justify-between px-3.5 py-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: accent.dot }}
                            title={`${accent.label}${hasOverride ? '' : ' (auto)'}`}
                          />
                          <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span className="text-sm font-medium text-neutral-900 truncate">{dest.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {onUpdateDestinationColor && (
                            <button
                              className={`p-1.5 rounded-md transition-colors ${
                                isColourOpen
                                  ? 'text-neutral-900 bg-neutral-100'
                                  : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50'
                              }`}
                              onClick={() => setOpenColourFor(isColourOpen ? null : dest.id)}
                              title="Choose colour"
                            >
                              <Palette className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            onClick={() => setToDelete(dest)}
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {isColourOpen && onUpdateDestinationColor && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden border-t border-neutral-100"
                        >
                          <div className="px-3.5 py-3 flex flex-wrap gap-1.5 items-center">
                            <button
                              onClick={() => handlePickColour(dest.id, null)}
                              className={`h-6 w-6 rounded-full border transition-transform hover:scale-110 flex items-center justify-center text-[9px] font-semibold ${
                                !hasOverride
                                  ? 'border-neutral-900 text-neutral-900'
                                  : 'border-neutral-300 text-neutral-500 hover:border-neutral-500'
                              }`}
                              title="Auto (pick from name)"
                              style={{
                                background:
                                  'repeating-conic-gradient(#f3f4f6 0% 25%, #ffffff 0% 50%) 50% / 8px 8px',
                              }}
                            >
                              A
                            </button>
                            {PALETTE_SLUGS.map(slug => {
                              const swatch = getPaletteSwatch(slug);
                              const selected = hasOverride && dest.color === slug;
                              return (
                                <button
                                  key={slug}
                                  onClick={() => handlePickColour(dest.id, slug)}
                                  className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${
                                    selected
                                      ? 'ring-2 ring-offset-2 ring-neutral-900'
                                      : 'ring-1 ring-inset ring-black/5'
                                  }`}
                                  style={{ backgroundColor: swatch.bar }}
                                  title={swatch.label}
                                  aria-label={swatch.label}
                                />
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
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
