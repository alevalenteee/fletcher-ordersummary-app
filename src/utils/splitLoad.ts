import { Order, SplitLoad, SplitLoadTrailer } from '@/types';

/** Remap product indexes after removing a product at `removedIndex`. */
export function remapSplitLoadAfterRemove(
  splitLoad: SplitLoad | undefined,
  removedIndex: number
): SplitLoad | undefined {
  if (!splitLoad) return undefined;

  const stops = splitLoad.stops
    .map(stop => ({
      ...stop,
      productIndexes: stop.productIndexes
        .filter(i => i !== removedIndex)
        .map(i => (i > removedIndex ? i - 1 : i)),
    }))
    .filter(stop => stop.productIndexes.length > 0);

  return stops.length > 1 ? { stops } : undefined;
}

export function trailerLabel(trailer: SplitLoadTrailer | null): string {
  if (trailer === 'A') return 'A-Trailer';
  if (trailer === 'B') return 'B-Trailer';
  return 'Unassigned';
}

/** Group stops by trailer for print/display (A, B, then unassigned). */
export function groupStopsByTrailer(stops: SplitLoad['stops']) {
  const a = stops.filter(s => s.trailer === 'A');
  const b = stops.filter(s => s.trailer === 'B');
  const unassigned = stops.filter(s => s.trailer === null);
  return { a, b, unassigned };
}

export interface PrintTrailerGroup {
  trailer: SplitLoadTrailer | null;
  productIndexes: number[];
}

/**
 * Build ordered print groups: unassigned products first (document order),
 * then A-Trailer, then B-Trailer. Empty groups are omitted.
 */
export function buildPrintTrailerGroups(order: Order): PrintTrailerGroup[] {
  if (!order.splitLoad || order.splitLoad.stops.length <= 1) return [];

  const buckets: Record<'A' | 'B' | 'unassigned', number[]> = {
    A: [],
    B: [],
    unassigned: [],
  };

  for (const stop of order.splitLoad.stops) {
    const key = stop.trailer === 'A' ? 'A' : stop.trailer === 'B' ? 'B' : 'unassigned';
    buckets[key].push(...stop.productIndexes);
  }

  const sortIndexes = (arr: number[]) => [...arr].sort((a, b) => a - b);

  const groups: PrintTrailerGroup[] = [];
  const unassigned = sortIndexes(buckets.unassigned);
  if (unassigned.length > 0) {
    groups.push({ trailer: null, productIndexes: unassigned });
  }
  const a = sortIndexes(buckets.A);
  if (a.length > 0) {
    groups.push({ trailer: 'A', productIndexes: a });
  }
  const b = sortIndexes(buckets.B);
  if (b.length > 0) {
    groups.push({ trailer: 'B', productIndexes: b });
  }

  return groups;
}

export function hasAssignedTrailers(order: Order): boolean {
  if (!order.splitLoad) return false;
  return order.splitLoad.stops.some(s => s.trailer === 'A' || s.trailer === 'B');
}

const TRAILER_PRINT_STYLES: Record<
  SplitLoadTrailer,
  { border: string; label: string }
> = {
  A: {
    border: 'border-2 border-blue-500 rounded-lg p-2 print:break-inside-avoid',
    label: 'text-xs font-semibold text-blue-700 mb-2',
  },
  B: {
    border: 'border-2 border-emerald-600 rounded-lg p-2 print:break-inside-avoid',
    label: 'text-xs font-semibold text-emerald-700 mb-2',
  },
};

export function getTrailerPrintStyles(trailer: SplitLoadTrailer) {
  return TRAILER_PRINT_STYLES[trailer];
}

const TRAILER_SCREEN_STYLES: Record<
  SplitLoadTrailer,
  { border: string; label: string }
> = {
  A: {
    border: 'border-2 border-blue-500 rounded-lg p-2',
    label: 'text-xs font-semibold text-blue-700 mb-2',
  },
  B: {
    border: 'border-2 border-emerald-600 rounded-lg p-2',
    label: 'text-xs font-semibold text-emerald-700 mb-2',
  },
};

const NEUTRAL_SCREEN_STYLES = {
  border: 'border-2 border-neutral-300 rounded-lg p-2',
  label: 'text-xs font-medium text-neutral-500 mb-2',
};

/** Border/label styles for a trailer group on screen or in print. */
export function getTrailerGroupStyles(
  trailer: SplitLoadTrailer | null,
  { isPrint = false }: { isPrint?: boolean } = {}
): { border: string; label: string } {
  if (trailer === 'A') {
    return isPrint ? TRAILER_PRINT_STYLES.A : TRAILER_SCREEN_STYLES.A;
  }
  if (trailer === 'B') {
    return isPrint ? TRAILER_PRINT_STYLES.B : TRAILER_SCREEN_STYLES.B;
  }
  return isPrint
    ? { border: '', label: '' }
    : NEUTRAL_SCREEN_STYLES;
}
