import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

// Per-order, per-product-index map of location codes. Persisted in
// localStorage so it survives refresh but stays local to the device.
export type LocationMap = Record<string, Record<number, string>>;

const STORAGE_KEY = 'fletcher.orderLocations.v1';

export function useOrderLocations() {
  const [map, setMap] = useLocalStorage<LocationMap>(STORAGE_KEY, {});

  const getLocationsFor = useCallback(
    (orderId: string | undefined): Record<number, string> => {
      if (!orderId) return {};
      return map[orderId] || {};
    },
    [map]
  );

  const getLocation = useCallback(
    (orderId: string | undefined, index: number): string | undefined => {
      if (!orderId) return undefined;
      return map[orderId]?.[index];
    },
    [map]
  );

  // Used by the modal's Submit. Replaces all entries for one order at once.
  const setDraft = useCallback(
    (orderId: string, draft: Record<number, string>) => {
      setMap(prev => {
        const next = { ...prev };
        const cleaned: Record<number, string> = {};
        for (const [idx, code] of Object.entries(draft)) {
          if (code) cleaned[Number(idx)] = code;
        }
        if (Object.keys(cleaned).length === 0) {
          delete next[orderId];
        } else {
          next[orderId] = cleaned;
        }
        return next;
      });
    },
    [setMap]
  );

  const clearLocation = useCallback(
    (orderId: string, index: number) => {
      setMap(prev => {
        const existing = prev[orderId];
        if (!existing || existing[index] === undefined) return prev;
        const nextOrder = { ...existing };
        delete nextOrder[index];
        const next = { ...prev };
        if (Object.keys(nextOrder).length === 0) {
          delete next[orderId];
        } else {
          next[orderId] = nextOrder;
        }
        return next;
      });
    },
    [setMap]
  );

  // Called explicitly when an order is deleted so its assignments disappear
  // with it. Safer than auto-pruning by absence, which would wipe the other
  // profile's entries on every profile switch.
  const clearOrder = useCallback(
    (orderId: string | undefined) => {
      if (!orderId) return;
      setMap(prev => {
        if (!(orderId in prev)) return prev;
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    },
    [setMap]
  );

  const clearAll = useCallback(() => {
    setMap({});
  }, [setMap]);

  return {
    map,
    getLocationsFor,
    getLocation,
    setDraft,
    clearLocation,
    clearOrder,
    clearAll,
  };
}
