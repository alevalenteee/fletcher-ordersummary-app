import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { cn } from '@/lib/utils';
import { INVENTORY_EXPIRY_MS, parseInventoryCsv } from '@/utils/inventoryCsv';
import type { ParsedInventoryRow } from '@/utils/inventoryCsv';

export interface InventoryUploadCardProps {
  rowCount: number;
  uploadedAt: string | null;
  loading: boolean;
  error: string | null;
  replaceInventory: (rows: ParsedInventoryRow[]) => Promise<void>;
  clearInventory: () => Promise<void>;
  className?: string;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '0m';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export const InventoryUploadCard: React.FC<InventoryUploadCardProps> = ({
  rowCount,
  uploadedAt,
  loading,
  error,
  replaceInventory,
  clearInventory,
  className,
}) => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [localStatus, setLocalStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  // When the user picks a file while a snapshot already exists we stash it
  // here and surface a confirm modal. Once they confirm we run the same
  // parse/replace flow against the stashed file.
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!uploadedAt) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [uploadedAt]);

  const ageAndRemaining = useMemo(() => {
    if (!uploadedAt) return null;
    const t = new Date(uploadedAt).getTime();
    const age = nowTick - t;
    const remaining = INVENTORY_EXPIRY_MS - age;
    return { age, remaining };
  }, [uploadedAt, nowTick]);

  const handlePickFile = () => {
    setLocalStatus(null);
    fileRef.current?.click();
  };

  const processFile = (file: File) => {
    setBusy(true);
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const text = (ev.target?.result as string) ?? '';
        const parsed = parseInventoryCsv(text);
        if (parsed.errors.length > 0) {
          setLocalStatus({ type: 'error', message: parsed.errors.join(' ') });
          return;
        }

        const parts: string[] = [];
        if (parsed.rows.length > 0) {
          parts.push(`Imported ${parsed.rows.length} row${parsed.rows.length === 1 ? '' : 's'}`);
        }
        const s = parsed.skipped;
        // `blank` covers empty bins / zero-quantity rows (expected noise) — don't surface.
        const reportable = s.unknownLocation + s.invalidQuantity;
        if (reportable > 0) {
          const bits: string[] = [];
          if (s.unknownLocation) {
            bits.push(`${s.unknownLocation} unknown location${s.unknownLocation === 1 ? '' : 's'}`);
          }
          if (s.invalidQuantity) {
            bits.push(`${s.invalidQuantity} invalid quantit${s.invalidQuantity === 1 ? 'y' : 'ies'}`);
          }
          parts.push(`Skipped: ${bits.join(', ')}`);
        }

        await replaceInventory(parsed.rows);
        setLocalStatus({
          type: 'success',
          message: parts.join(' · ') || 'Inventory cleared (no valid rows).',
        });
      } catch (err) {
        setLocalStatus({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to import inventory',
        });
      } finally {
        setBusy(false);
      }
    };
    reader.onerror = () => {
      setLocalStatus({ type: 'error', message: 'Failed to read file' });
      setBusy(false);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    // Replacing an existing snapshot is destructive — surface a confirm modal
    // and only proceed once the user accepts. First-time uploads (empty
    // snapshot) skip the modal and import directly.
    if (rowCount > 0) {
      setPendingFile(file);
      return;
    }

    processFile(file);
  };

  const handleConfirmReplace = () => {
    if (!pendingFile) return;
    const file = pendingFile;
    setPendingFile(null);
    processFile(file);
  };

  const handleClear = async () => {
    setShowClearConfirm(false);
    setBusy(true);
    try {
      await clearInventory();
      setLocalStatus({
        type: 'success',
        message: 'Inventory cleared — re-upload to auto-assign new orders.',
      });
    } catch {
      /* error surfaced via hook */
    } finally {
      setBusy(false);
    }
  };

  const combinedError = error || (localStatus?.type === 'error' ? localStatus.message : null);

  return (
    <div className={cn('section mb-6', className)}>
      <div className="bg-white p-6 sm:p-7 rounded-card border border-neutral-200/70 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-md bg-neutral-100 text-neutral-600 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold tracking-tight text-neutral-900 truncate">
              Inventory
            </h2>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border tabular-nums text-xs font-medium shrink-0',
                rowCount > 0
                  ? 'bg-brand-50 border-brand-200/60 text-brand-700'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-500'
              )}
            >
              {rowCount}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              onClick={handlePickFile}
              size="sm"
              disabled={loading}
              className="flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload CSV
            </Button>
            <Button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              size="sm"
              variant="ghost"
              disabled={loading || rowCount === 0 || busy}
              className="flex items-center gap-1.5 text-neutral-600"
              title="Remove inventory snapshot"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </Button>
          </div>
        </div>

        {ageAndRemaining && rowCount > 0 && (
          <p className="mt-3 text-xs text-neutral-500 tabular-nums">
            Uploaded {formatDuration(ageAndRemaining.age)} ago — auto-clears in{' '}
            {formatDuration(Math.max(0, ageAndRemaining.remaining))}
          </p>
        )}

        {combinedError && (
          <div className="mt-4 px-3.5 py-2.5 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
            {combinedError}
          </div>
        )}

        {localStatus?.type === 'success' && !combinedError && (
          <div className="mt-4 px-3.5 py-2.5 rounded-lg text-sm bg-brand-50 text-brand-700 border border-brand-200/60">
            {localStatus.message}
          </div>
        )}

        <p className="mt-3 text-xs text-neutral-500 leading-relaxed">
          Columns: <span className="font-medium text-neutral-700">Storage Bin</span>,{' '}
          <span className="font-medium text-neutral-700">Product</span>,{' '}
          <span className="font-medium text-neutral-700">Quantity</span>. Each upload replaces the previous
          snapshot; data expires after 12 hours.
        </p>
      </div>

      <ConfirmationModal
        isOpen={pendingFile !== null}
        onClose={() => setPendingFile(null)}
        onConfirm={handleConfirmReplace}
        title="Replace inventory snapshot?"
        message={
          <>
            Uploading <span className="font-medium text-neutral-800">{pendingFile?.name}</span> will
            replace the current snapshot of{' '}
            <span className="font-medium text-neutral-800 tabular-nums">{rowCount}</span> row
            {rowCount === 1 ? '' : 's'}. This cannot be undone.
          </>
        }
        confirmText="Replace snapshot"
        cancelText="Keep current"
        tone="warning"
        confirmVariant="default"
        busy={busy}
      />

      <ConfirmationModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClear}
        title="Clear inventory?"
        message={
          <>
            This removes all{' '}
            <span className="font-medium text-neutral-800 tabular-nums">{rowCount}</span> inventory
            row{rowCount === 1 ? '' : 's'} from the server. Re-upload a CSV to auto-assign new orders.
          </>
        }
        confirmText="Clear inventory"
        cancelText="Cancel"
        tone="danger"
        confirmVariant="danger"
        busy={busy}
      />
    </div>
  );
};
