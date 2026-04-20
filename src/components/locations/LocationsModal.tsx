import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { Location, Order, OrderProduct, Product } from '@/types';
import { ModalTransition } from '../transitions/ModalTransition';
import { Button } from '../ui/Button';
import { formatRValue, getProductDetails } from '@/utils';
import { sortOrdersByTime } from '@/utils/time';
import { LocationPicker, LocationPickerHandle } from './LocationPicker';

interface LocationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  productData: Product[];
  locations: Location[];
  getLocationsFor: (orderId: string | undefined) => Record<number, string[]>;
  onSubmit: (orderId: string, draft: Record<number, string[]>) => void;
}

type DraftMap = Record<string, Record<number, string[]>>;

interface Row {
  orderId: string;
  productIndex: number;
  product: OrderProduct;
}

interface Section {
  orderId: string;
  order: Order;
  rows: Row[];
}

const productLabel = (product: OrderProduct, productData: Product[]): { name: string; code: string } => {
  const details = getProductDetails(product.productCode, productData);
  if (details) {
    const name = `${details.category} ${formatRValue(details.rValue)}${details.width ? ` (${details.width})` : ''}`.trim();
    return { name, code: `${details.newCode} (${details.oldCode})` };
  }
  if (product.manualDetails) {
    return {
      name: product.manualDetails.category,
      code: product.manualDetails.secondaryCode
        ? `${product.productCode} (${product.manualDetails.secondaryCode})`
        : product.productCode,
    };
  }
  return { name: 'Unknown product', code: product.productCode };
};

export const LocationsModal: React.FC<LocationsModalProps> = ({
  isOpen,
  onClose,
  orders,
  productData,
  locations,
  getLocationsFor,
  onSubmit,
}) => {
  const [draft, setDraft] = useState<DraftMap>({});

  const sections: Section[] = useMemo(() => {
    const sorted = sortOrdersByTime(orders);
    return sorted
      .filter(o => !!o.id)
      .map(order => ({
        orderId: order.id as string,
        order,
        rows: order.products.map((product, productIndex) => ({
          orderId: order.id as string,
          productIndex,
          product,
        })),
      }));
  }, [orders]);

  const flatRows: Row[] = useMemo(() => sections.flatMap(s => s.rows), [sections]);

  // Seed draft from current persisted map whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    const seed: DraftMap = {};
    for (const section of sections) {
      const current = getLocationsFor(section.orderId);
      if (Object.keys(current).length > 0) {
        seed[section.orderId] = { ...current };
      }
    }
    setDraft(seed);
  }, [isOpen, sections, getLocationsFor]);

  const pickerRefs = useRef<Array<LocationPickerHandle | null>>([]);

  // Autofocus first picker when modal opens so staff can start typing immediately.
  useEffect(() => {
    if (!isOpen) return;
    const timeout = setTimeout(() => {
      pickerRefs.current[0]?.focus();
    }, 120);
    return () => clearTimeout(timeout);
  }, [isOpen, flatRows.length]);

  const handlePick = (orderId: string, productIndex: number, codes: string[]) => {
    setDraft(prev => {
      const next = { ...prev };
      const existing = { ...(next[orderId] || {}) };
      if (codes.length > 0) {
        existing[productIndex] = codes;
      } else {
        delete existing[productIndex];
      }
      if (Object.keys(existing).length === 0) {
        delete next[orderId];
      } else {
        next[orderId] = existing;
      }
      return next;
    });
  };

  const handleAdvance = (flatIndex: number) => {
    const next = pickerRefs.current[flatIndex + 1];
    if (next) {
      next.focus();
    }
  };

  const handleSubmit = () => {
    // Commit every section that currently has a draft AND every section that
    // previously had entries but is now empty (so that clearing a selection
    // persists).
    const touched = new Set<string>([
      ...Object.keys(draft),
      ...sections.map(s => s.orderId),
    ]);
    for (const orderId of touched) {
      onSubmit(orderId, draft[orderId] || {});
    }
    onClose();
  };

  // Map row → flat index for ref assignment.
  let flatCursor = 0;

  return (
    <ModalTransition isOpen={isOpen} onClose={onClose} maxWidth="760px">
      <div className="flex flex-col max-h-[85vh]">
        <div className="p-6 pt-4 md:pt-6 pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-neutral-100 text-neutral-600">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
                Add locations
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Tap a location to assign — the picker jumps to the next row. Re-open to add more for a product, then press Done.
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {sections.length === 0 && (
            <p className="text-sm text-neutral-500 text-center py-8">
              No orders to assign locations to.
            </p>
          )}

          {sections.map(section => (
            <div key={section.orderId}>
              <div className="mb-2 flex items-baseline gap-2">
                <h3 className="text-sm font-semibold tracking-tight text-neutral-900 truncate">
                  {section.order.destination}
                </h3>
                <span className="text-xs text-neutral-400 tabular-nums">{section.order.time}</span>
              </div>

              <div className="rounded-lg border border-neutral-200/70 divide-y divide-neutral-100 bg-white">
                {section.rows.map(row => {
                  const { name, code } = productLabel(row.product, productData);
                  const current = draft[row.orderId]?.[row.productIndex] ?? [];
                  const flatIndex = flatCursor++;
                  return (
                    <div
                      key={`${row.orderId}-${row.productIndex}`}
                      className="flex items-center gap-3 px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-neutral-900 truncate">{name}</div>
                        <div className="text-xs text-neutral-500 tabular-nums truncate">
                          {code}
                          <span className="text-neutral-300"> · </span>
                          <span className="text-neutral-400">{row.product.packsOrdered} packs</span>
                        </div>
                      </div>
                      <div className="w-40 shrink-0">
                        <LocationPicker
                          ref={(el) => (pickerRefs.current[flatIndex] = el)}
                          value={current}
                          onChange={(codes) => handlePick(row.orderId, row.productIndex, codes)}
                          onAdvance={() => handleAdvance(flatIndex)}
                          locations={locations}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-between gap-3">
          <p className="text-xs text-neutral-500">
            {Object.values(draft).reduce((sum, entry) => sum + Object.keys(entry).length, 0)} assigned
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Submit
            </Button>
          </div>
        </div>
      </div>
    </ModalTransition>
  );
};
