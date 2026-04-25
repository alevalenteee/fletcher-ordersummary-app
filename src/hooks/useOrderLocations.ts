import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Order } from '@/types';

// Per-order, per-product-index map of location codes. Persisted on the
// `orders` row in Supabase so it stays consistent across devices/browsers.
// Each product index holds an array of codes (multi-select).
export type LocationMap = Record<string, Record<number, string[]>>;

// Legacy device-local stores. Kept for one-time migration on first load
// after upgrading to the synced model — entries that match a known order
// id are pushed up to Supabase, then the storage entries are dropped.
const LEGACY_V2_KEY = 'fletcher.orderLocations.v2';
const LEGACY_V1_KEY = 'fletcher.orderLocations.v1';

interface UseOrderLocationsArgs {
  orders: Order[];
  updateOrderLocations: (
    orderId: string,
    locations: Record<number, string[]>
  ) => Promise<void>;
}

function sameAssignments(
  a: Record<number, string[]>,
  b: Record<number, string[]>
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    const va = a[k as unknown as number];
    const vb = b[k as unknown as number];
    if (!vb || va.length !== vb.length) return false;
    for (let i = 0; i < va.length; i++) {
      if (va[i] !== vb[i]) return false;
    }
  }
  return true;
}

function readLegacyEntries(): LocationMap {
  const merged: LocationMap = {};
  try {
    const v2Raw = window.localStorage.getItem(LEGACY_V2_KEY);
    if (v2Raw) {
      const parsed = JSON.parse(v2Raw) as LocationMap;
      if (parsed && typeof parsed === 'object') {
        for (const [oid, entry] of Object.entries(parsed)) {
          if (entry && typeof entry === 'object') merged[oid] = entry;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to read legacy v2 location store:', err);
  }
  try {
    const v1Raw = window.localStorage.getItem(LEGACY_V1_KEY);
    if (v1Raw) {
      const legacy = JSON.parse(v1Raw) as Record<string, Record<number, string>>;
      if (legacy && typeof legacy === 'object') {
        for (const [oid, entry] of Object.entries(legacy)) {
          if (!entry || typeof entry !== 'object' || merged[oid]) continue;
          const upgraded: Record<number, string[]> = {};
          for (const [idx, code] of Object.entries(entry)) {
            if (typeof code === 'string' && code.length > 0) {
              upgraded[Number(idx)] = [code];
            }
          }
          if (Object.keys(upgraded).length > 0) merged[oid] = upgraded;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to read legacy v1 location store:', err);
  }
  return merged;
}

function writeRemainingLegacy(remaining: LocationMap) {
  try {
    if (Object.keys(remaining).length === 0) {
      window.localStorage.removeItem(LEGACY_V2_KEY);
    } else {
      window.localStorage.setItem(LEGACY_V2_KEY, JSON.stringify(remaining));
    }
    // Always drop v1 once v2 has been read — its data has either been
    // promoted into `merged` or there was nothing to promote.
    window.localStorage.removeItem(LEGACY_V1_KEY);
  } catch (err) {
    console.warn('Failed to update legacy location store:', err);
  }
}

export function useOrderLocations({ orders, updateOrderLocations }: UseOrderLocationsArgs) {
  // Map<orderId, Record<index, string[]>> derived from the live orders array.
  const map = useMemo(() => {
    const out: LocationMap = {};
    for (const o of orders) {
      if (o.id) out[o.id] = o.locations ?? {};
    }
    return out;
  }, [orders]);

  const getLocationsFor = useCallback(
    (orderId: string | undefined): Record<number, string[]> => {
      if (!orderId) return {};
      return map[orderId] ?? {};
    },
    [map]
  );

  const setDraft = useCallback(
    (orderId: string, draft: Record<number, string[]>) => {
      const cleaned: Record<number, string[]> = {};
      for (const [idx, codes] of Object.entries(draft)) {
        if (Array.isArray(codes) && codes.length > 0) {
          cleaned[Number(idx)] = Array.from(new Set(codes));
        }
      }
      // Avoid hitting Supabase when the draft hasn't actually changed —
      // the locations modal commits every section on Submit, including
      // ones the user never touched, so this skips noisy round-trips.
      const current = map[orderId] ?? {};
      if (sameAssignments(current, cleaned)) return;
      void updateOrderLocations(orderId, cleaned);
    },
    [map, updateOrderLocations]
  );

  // Order deletion already cascades through the orders state, so the row
  // disappears from `map` automatically. Kept as a no-op for API symmetry
  // with the previous localStorage-backed hook.
  const clearOrder = useCallback((_orderId: string | undefined) => {
    // intentionally empty
  }, []);

  // One-shot migration of legacy localStorage entries → Supabase. Runs each
  // time the orders array updates so multi-profile users still migrate any
  // entries they couldn't on the previous render. Successfully-pushed
  // entries are removed from the legacy store so we don't re-push.
  const migrationLockRef = useRef(false);
  useEffect(() => {
    if (migrationLockRef.current) return;
    if (orders.length === 0) return;
    const legacy = readLegacyEntries();
    if (Object.keys(legacy).length === 0) {
      // Nothing to migrate — wipe legacy keys so we don't re-read on every
      // orders refresh and lock until the page reloads.
      writeRemainingLegacy({});
      migrationLockRef.current = true;
      return;
    }

    migrationLockRef.current = true;
    const ordersById = new Map(orders.filter(o => !!o.id).map(o => [o.id as string, o]));
    const remaining: LocationMap = {};
    const tasks: Array<Promise<void>> = [];

    for (const [oid, entry] of Object.entries(legacy)) {
      if (!ordersById.has(oid)) {
        // Order isn't loaded under the current profile — keep for later.
        remaining[oid] = entry;
        continue;
      }
      // Only push if Supabase doesn't already have an entry; we treat any
      // non-empty server map as authoritative to avoid clobbering newer
      // assignments from another device.
      const current = ordersById.get(oid)?.locations ?? {};
      if (Object.keys(current).length > 0) continue;
      tasks.push(
        updateOrderLocations(oid, entry).catch(err => {
          // Keep failed entries in localStorage so the next attempt can retry.
          console.warn('Failed to migrate location entry for order', oid, err);
          remaining[oid] = entry;
        })
      );
    }

    Promise.all(tasks).finally(() => {
      writeRemainingLegacy(remaining);
    });
  }, [orders, updateOrderLocations]);

  return {
    map,
    getLocationsFor,
    setDraft,
    clearOrder,
  };
}
