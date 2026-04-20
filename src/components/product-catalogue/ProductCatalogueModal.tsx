import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Database, Plus, Search, Trash2, Upload, Download, X } from 'lucide-react';
import { Product, ProductType, PRODUCT_TYPES } from '@/types';
import { ModalTransition } from '../transitions/ModalTransition';
import { Button } from '../ui/Button';
import { parseCSV, downloadCSV } from '@/utils/csv';

interface ProductCatalogueModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSave: (products: Product[]) => Promise<void> | void;
}

// Row with a stable client-side id so React + selection tracks correctly
// across edits (newCode is user-editable and can collide temporarily).
interface DraftRow extends Product {
  _rowId: string;
  _isNew?: boolean;
}

const makeRowId = () =>
  `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const toDraft = (products: Product[]): DraftRow[] =>
  products.map(p => ({ ...p, _rowId: makeRowId() }));

const fromDraft = (rows: DraftRow[]): Product[] =>
  rows.map(({ _rowId, _isNew, ...rest }) => {
    void _rowId;
    void _isNew;
    return rest;
  });

interface RowError {
  category?: boolean;
  codes?: boolean;
  packs?: boolean;
  duplicate?: boolean;
}

const validateRows = (rows: DraftRow[]): Record<string, RowError> => {
  const errors: Record<string, RowError> = {};
  const codeCounts = new Map<string, number>();
  for (const row of rows) {
    const code = row.newCode.trim();
    if (code) codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
  }
  for (const row of rows) {
    const err: RowError = {};
    if (!row.category.trim()) err.category = true;
    if (!row.newCode.trim() && !row.oldCode.trim()) err.codes = true;
    if (!row.packsPerBale || row.packsPerBale <= 0) err.packs = true;
    const code = row.newCode.trim();
    if (code && (codeCounts.get(code) ?? 0) > 1) err.duplicate = true;
    if (Object.keys(err).length > 0) errors[row._rowId] = err;
  }
  return errors;
};

export const ProductCatalogueModal: React.FC<ProductCatalogueModalProps> = ({
  isOpen,
  onClose,
  products,
  onSave,
}) => {
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  // Rows that previously had a validation error and have since been fixed.
  // These stay visually highlighted (green) until Save/Cancel/close, so the
  // user can see the work they just did and aren't surprised when rows
  // disappear from the errors-only filter.
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const prevErrorIdsRef = useRef<Set<string>>(new Set());
  // Anchor for shift-click range selection — set on every checkbox click.
  const [anchorId, setAnchorId] = useState<string | null>(null);
  // Captured on mousedown so we know whether the shift key was held at the
  // start of a click. Reading it in the change handler is more reliable than
  // fighting the browser's native toggle via preventDefault on a controlled
  // checkbox, which doesn't stop React's onChange from firing.
  const shiftHeldRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Reset draft whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setRows(toDraft(products));
    setSearch('');
    setSelected(new Set());
    setImportError(null);
    setShowErrorsOnly(false);
    setAnchorId(null);
    setResolvedIds(new Set());
    prevErrorIdsRef.current = new Set();
  }, [isOpen, products]);

  const errors = useMemo(() => validateRows(rows), [rows]);
  const errorCount = Object.keys(errors).length;
  const hasErrors = errorCount > 0;
  const resolvedCount = useMemo(
    () => rows.reduce((n, r) => (!errors[r._rowId] && resolvedIds.has(r._rowId) ? n + 1 : n), 0),
    [rows, errors, resolvedIds]
  );

  // Track transitions into/out of error state so we can paint "just fixed"
  // rows green and keep them visible while errors-only is active. A row that
  // leaves the errors map moves into `resolvedIds`; if it re-enters (user
  // typed something that broke it again) it leaves `resolvedIds`.
  useEffect(() => {
    const currentIds = new Set(Object.keys(errors));
    const prevIds = prevErrorIdsRef.current;
    const newlyResolved: string[] = [];
    for (const id of prevIds) {
      if (!currentIds.has(id)) newlyResolved.push(id);
    }
    const reErrored: string[] = [];
    for (const id of currentIds) {
      if (!prevIds.has(id)) reErrored.push(id);
    }
    if (newlyResolved.length > 0 || reErrored.length > 0) {
      setResolvedIds(prev => {
        const next = new Set(prev);
        for (const id of newlyResolved) next.add(id);
        for (const id of reErrored) next.delete(id);
        return next;
      });
    }
    prevErrorIdsRef.current = currentIds;
  }, [errors]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows;
    if (q) {
      list = list.filter(r =>
        r.category.toLowerCase().includes(q) ||
        r.newCode.toLowerCase().includes(q) ||
        r.oldCode.toLowerCase().includes(q) ||
        (r.type ?? '').toLowerCase().includes(q) ||
        r.rValue.toLowerCase().includes(q) ||
        r.width.toLowerCase().includes(q)
      );
    }
    if (showErrorsOnly) {
      list = list.filter(r => errors[r._rowId] || resolvedIds.has(r._rowId));
    }
    return list;
  }, [rows, search, showErrorsOnly, errors, resolvedIds]);

  // Human-readable description of what's wrong on a row, for tooltips.
  const describeRowError = useCallback((rowId: string): string => {
    const err = errors[rowId];
    if (!err) return '';
    const parts: string[] = [];
    if (err.category) parts.push('Category is required');
    if (err.codes) parts.push('At least one of New code or Old code is required');
    if (err.packs) parts.push('Packs per bale must be greater than 0');
    if (err.duplicate) parts.push('Duplicate New code (another row has the same value)');
    return parts.join(' · ');
  }, [errors]);

  const updateRow = useCallback((rowId: string, patch: Partial<Product>) => {
    setRows(prev => prev.map(r => (r._rowId === rowId ? { ...r, ...patch } : r)));
  }, []);

  const addRow = useCallback(() => {
    const newRow: DraftRow = {
      _rowId: makeRowId(),
      _isNew: true,
      category: '',
      rValue: '',
      newCode: '',
      oldCode: '',
      packsPerBale: 1,
      width: '',
      type: undefined,
    };
    setRows(prev => [newRow, ...prev]);
    // Scroll to top so the new row is visible.
    queueMicrotask(() => {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }, []);

  const deleteRow = useCallback((rowId: string) => {
    setRows(prev => prev.filter(r => r._rowId !== rowId));
    setSelected(prev => {
      if (!prev.has(rowId)) return prev;
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
    setResolvedIds(prev => {
      if (!prev.has(rowId)) return prev;
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
  }, []);

  const deleteSelected = useCallback(() => {
    if (selected.size === 0) return;
    setRows(prev => prev.filter(r => !selected.has(r._rowId)));
    setResolvedIds(prev => {
      let changed = false;
      const next = new Set(prev);
      for (const id of selected) {
        if (next.delete(id)) changed = true;
      }
      return changed ? next : prev;
    });
    setSelected(new Set());
  }, [selected]);

  // Record whether shift was held at mousedown so the subsequent change
  // event can make a decision about range-fill vs plain toggle.
  const handleCheckboxMouseDown = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    shiftHeldRef.current = e.shiftKey;
  }, []);

  // Checkbox onChange handler. When shift was held and we have an anchor,
  // we range-fill every row between the anchor and the clicked row inclusive
  // and mirror the anchor's current selected state across that range. The
  // browser will already have toggled the clicked row in the DOM — our state
  // update then syncs React's `checked` prop back to the intended value, so
  // the clicked row ends up correctly included in the range.
  const handleCheckboxChange = useCallback(
    (rowId: string) => {
      const shifted = shiftHeldRef.current;
      shiftHeldRef.current = false;
      if (shifted && anchorId && anchorId !== rowId) {
        const ids = filteredRows.map(r => r._rowId);
        const a = ids.indexOf(anchorId);
        const b = ids.indexOf(rowId);
        if (a !== -1 && b !== -1) {
          const [from, to] = a < b ? [a, b] : [b, a];
          const range = ids.slice(from, to + 1);
          const anchorSelected = selected.has(anchorId);
          setSelected(prev => {
            const next = new Set(prev);
            for (const id of range) {
              if (anchorSelected) next.add(id);
              else next.delete(id);
            }
            return next;
          });
        }
        // Keep the original anchor so the user can shift-click again to
        // refine the range from the same starting point.
        return;
      }
      setSelected(prev => {
        const next = new Set(prev);
        if (next.has(rowId)) next.delete(rowId);
        else next.add(rowId);
        return next;
      });
      setAnchorId(rowId);
    },
    [anchorId, filteredRows, selected]
  );

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setAnchorId(null);
  }, []);

  const toggleSelectAllFiltered = useCallback(() => {
    const filteredIds = filteredRows.map(r => r._rowId);
    const allSelected = filteredIds.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) {
        for (const id of filteredIds) next.delete(id);
      } else {
        for (const id of filteredIds) next.add(id);
      }
      return next;
    });
    setAnchorId(null);
  }, [filteredRows, selected]);

  const batchSetType = useCallback(
    (type: ProductType | undefined) => {
      if (selected.size === 0) return;
      setRows(prev =>
        prev.map(r => (selected.has(r._rowId) ? { ...r, type } : r))
      );
    },
    [selected]
  );

  const handleImportClick = () => {
    setImportError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const confirmed = window.confirm(
      'Importing a CSV will replace every row in this editor with the CSV contents. Unsaved changes will be lost. Continue?'
    );
    if (!confirmed) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const csv = ev.target?.result as string;
        const parsed = parseCSV(csv);
        if (parsed.length === 0) {
          throw new Error('No valid products found in CSV');
        }
        setRows(toDraft(parsed));
        setSelected(new Set());
        setImportError(null);
      } catch (err) {
        setImportError(
          err instanceof Error ? err.message : 'Failed to read CSV'
        );
      }
    };
    reader.onerror = () => setImportError('Failed to read file');
    reader.readAsText(file);
  };

  const handleExport = () => {
    downloadCSV(fromDraft(rows));
  };

  const handleSave = async () => {
    if (hasErrors) return;
    setSaving(true);
    try {
      // Trim strings before saving for a consistent catalogue shape.
      const cleaned = fromDraft(rows).map(p => ({
        ...p,
        category: p.category.trim(),
        rValue: p.rValue.trim(),
        newCode: p.newCode.trim(),
        oldCode: p.oldCode.trim(),
        width: p.width.trim(),
      }));
      await onSave(cleaned);
      onClose();
    } catch (err) {
      console.error('Failed to save catalogue:', err);
      setImportError(
        err instanceof Error ? err.message : 'Failed to save catalogue'
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredAllSelected =
    filteredRows.length > 0 && filteredRows.every(r => selected.has(r._rowId));

  const originalCount = products.length;
  const currentCount = rows.length;
  const diff = currentCount - originalCount;

  return (
    <ModalTransition isOpen={isOpen} onClose={onClose} maxWidth="1100px">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 pt-4 md:pt-6 pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-md bg-neutral-100 text-neutral-600">
              <Database className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
                Product catalogue
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Add, edit, and remove products. Changes are saved together when you press Save.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code, category, type…"
                className="w-full h-9 pl-8 pr-3 border border-neutral-200 rounded-lg bg-white text-sm focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
              />
            </div>
            <Button
              onClick={addRow}
              size="sm"
              variant="outline"
              className="flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add product
            </Button>
            <Button
              onClick={handleImportClick}
              size="sm"
              variant="ghost"
              className="flex items-center gap-1.5"
              title="Replace all rows with a CSV file"
            >
              <Upload className="w-3.5 h-3.5" />
              Import CSV
            </Button>
            <Button
              onClick={handleExport}
              size="sm"
              variant="ghost"
              className="flex items-center gap-1.5"
              title="Download current editor contents as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {importError && (
            <div className="mt-3 px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
              {importError}
            </div>
          )}

          {/* Batch bar */}
          {selected.size > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 px-3 py-2 bg-neutral-900 text-white rounded-lg">
              <span className="text-xs font-medium tabular-nums">
                {selected.size} selected
              </span>
              <span className="text-xs text-neutral-400">·</span>
              <span className="text-xs text-neutral-300">Set type:</span>
              <div className="flex gap-1">
                {PRODUCT_TYPES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => batchSetType(t)}
                    className="px-2 py-1 text-xs rounded-md bg-neutral-800 hover:bg-neutral-700 transition-colors"
                  >
                    {t}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => batchSetType(undefined)}
                  className="px-2 py-1 text-xs rounded-md bg-neutral-800 hover:bg-neutral-700 transition-colors"
                  title="Clear type"
                >
                  —
                </button>
              </div>
              <span className="text-xs text-neutral-400">·</span>
              <button
                type="button"
                onClick={deleteSelected}
                className="flex items-center gap-1 px-2 py-1 text-xs text-red-300 hover:bg-red-500/20 rounded-md transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Delete selected
              </button>
              <div className="ml-auto">
                <button
                  type="button"
                  onClick={clearSelection}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-md transition-colors"
                  aria-label="Clear selection"
                  title="Deselect all rows"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div ref={scrollRef} className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-neutral-50 z-10 border-b border-neutral-200">
              <tr className="text-left text-[11px] font-medium tracking-wide uppercase text-neutral-500">
                <th className="px-3 py-2 w-8">
                  <input
                    type="checkbox"
                    checked={filteredAllSelected}
                    onChange={toggleSelectAllFiltered}
                    className="rounded border-neutral-300"
                    aria-label="Select all visible"
                  />
                </th>
                <th className="px-2 py-2">Category</th>
                <th className="px-2 py-2 w-24">Type</th>
                <th className="px-2 py-2 w-20">R-Value</th>
                <th className="px-2 py-2 w-28">New code</th>
                <th className="px-2 py-2 w-28">Old code</th>
                <th className="px-2 py-2 w-20">Packs/bale</th>
                <th className="px-2 py-2 w-20">Width</th>
                <th className="px-2 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-neutral-500">
                    {rows.length === 0
                      ? 'No products yet. Click "Add product" or "Import CSV" to get started.'
                      : 'No products match your search.'}
                  </td>
                </tr>
              )}
              {filteredRows.map(row => {
                const err = errors[row._rowId];
                const isSelected = selected.has(row._rowId);
                const isResolved = !err && resolvedIds.has(row._rowId);
                const rowBg = isSelected
                  ? 'bg-neutral-50'
                  : isResolved
                    ? 'bg-emerald-50/60 hover:bg-emerald-50'
                    : row._isNew
                      ? 'bg-brand-50/40'
                      : 'bg-white hover:bg-neutral-50/60';
                const rowRing = err
                  ? 'ring-1 ring-inset ring-red-300/60'
                  : isResolved
                    ? 'ring-1 ring-inset ring-emerald-300/70'
                    : '';
                return (
                  <tr
                    key={row._rowId}
                    className={`border-b border-neutral-100 transition-colors ${rowBg} ${rowRing}`}
                    title={
                      isResolved
                        ? 'Fixed — click Save to commit changes to the database'
                        : undefined
                    }
                  >
                    <td
                      className="px-3 py-1.5"
                      title={err ? describeRowError(row._rowId) : undefined}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onMouseDown={handleCheckboxMouseDown}
                        onChange={() => handleCheckboxChange(row._rowId)}
                        className="rounded border-neutral-300"
                        aria-label="Select row (shift-click to select range)"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={row.category}
                        onChange={(e) => updateRow(row._rowId, { category: e.target.value })}
                        title={err?.category ? 'Category is required' : undefined}
                        className={`w-full h-8 px-2 rounded-md border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900/10 ${
                          err?.category ? 'border-red-300' : 'border-transparent hover:border-neutral-200 focus:border-neutral-900'
                        }`}
                        placeholder="Category"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={row.type ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateRow(row._rowId, { type: v === '' ? undefined : (v as ProductType) });
                        }}
                        className="w-full h-8 px-2 rounded-md border border-transparent hover:border-neutral-200 focus:border-neutral-900 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                      >
                        <option value="">—</option>
                        {PRODUCT_TYPES.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={row.rValue}
                        onChange={(e) => updateRow(row._rowId, { rValue: e.target.value })}
                        className="w-full h-8 px-2 rounded-md border border-transparent hover:border-neutral-200 focus:border-neutral-900 text-sm bg-white tabular-nums focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                        placeholder="2.0"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={row.newCode}
                        onChange={(e) => updateRow(row._rowId, { newCode: e.target.value })}
                        title={
                          err?.duplicate
                            ? 'Duplicate New code — another row has the same value'
                            : err?.codes
                            ? 'At least one of New code or Old code is required'
                            : undefined
                        }
                        className={`w-full h-8 px-2 rounded-md border text-sm bg-white tabular-nums focus:outline-none focus:ring-2 focus:ring-neutral-900/10 ${
                          err?.codes || err?.duplicate ? 'border-red-300' : 'border-transparent hover:border-neutral-200 focus:border-neutral-900'
                        }`}
                        placeholder="Code"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={row.oldCode}
                        onChange={(e) => updateRow(row._rowId, { oldCode: e.target.value })}
                        title={err?.codes ? 'At least one of New code or Old code is required' : undefined}
                        className={`w-full h-8 px-2 rounded-md border text-sm bg-white tabular-nums focus:outline-none focus:ring-2 focus:ring-neutral-900/10 ${
                          err?.codes ? 'border-red-300' : 'border-transparent hover:border-neutral-200 focus:border-neutral-900'
                        }`}
                        placeholder="Code"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min={1}
                        value={row.packsPerBale || ''}
                        onChange={(e) =>
                          updateRow(row._rowId, {
                            packsPerBale: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        title={err?.packs ? 'Packs per bale must be greater than 0' : undefined}
                        className={`w-full h-8 px-2 rounded-md border text-sm bg-white tabular-nums focus:outline-none focus:ring-2 focus:ring-neutral-900/10 ${
                          err?.packs ? 'border-red-300' : 'border-transparent hover:border-neutral-200 focus:border-neutral-900'
                        }`}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={row.width}
                        onChange={(e) => updateRow(row._rowId, { width: e.target.value })}
                        className="w-full h-8 px-2 rounded-md border border-transparent hover:border-neutral-200 focus:border-neutral-900 text-sm bg-white tabular-nums focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                        placeholder="430"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => deleteRow(row._rowId)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        aria-label="Delete row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-neutral-500 flex items-center gap-2 flex-wrap">
            <span className="tabular-nums">{currentCount} products</span>
            {diff !== 0 && (
              <span className={`tabular-nums ${diff > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                ({diff > 0 ? '+' : ''}{diff} vs saved)
              </span>
            )}
            {hasErrors && (
              <>
                <span className="text-neutral-300">·</span>
                <button
                  type="button"
                  onClick={() => setShowErrorsOnly(v => !v)}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium transition-colors ${
                    showErrorsOnly
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'text-red-600 hover:bg-red-50'
                  }`}
                  title={showErrorsOnly ? 'Showing only rows with errors — click to show all' : 'Click to show only the rows that need fixing'}
                >
                  <AlertTriangle className="w-3 h-3" />
                  {errorCount} row{errorCount === 1 ? '' : 's'} need fixing
                  {showErrorsOnly && ' (filtered)'}
                </button>
              </>
            )}
            {resolvedCount > 0 && (
              <>
                <span className="text-neutral-300">·</span>
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium text-emerald-700 bg-emerald-50"
                  title="These rows were fixed. Click Save to commit to the database."
                >
                  {resolvedCount} fixed — pending save
                </span>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={hasErrors || saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </ModalTransition>
  );
};
