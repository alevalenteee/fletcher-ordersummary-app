import { useCallback, useEffect, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';

// Per-order, per-product-index map of location codes. Persisted in
// localStorage so it survives refresh but stays local to the device.
// Each product index holds an array of codes (multi-select).
export type LocationMap = Record<string, Record<number, string[]>>;

const STORAGE_KEY = 'fletcher.orderLocations.v2';
const LEGACY_KEY = 'fletcher.orderLocations.v1';

// Read legacy v1 shape (Record<orderId, Record<index, string>>) and upgrade
// to v2 arrays. Runs once on mount if v2 is empty and v1 exists.
function migrateV1IfNeeded(setMap: (v: LocationMap) => void, currentV2Empty: boolean) {
  try {
    if (!currentV2Empty) return;
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const legacy = JSON.parse(raw) as Record<string, Record<number, string>>;
    if (!legacy || typeof legacy !== 'object') return;

    const upgraded: LocationMap = {};
    for (const [orderId, entry] of Object.entries(legacy)) {
      if (!entry || typeof entry !== 'object') continue;
      const upgradedEntry: Record<number, string[]> = {};
      for (const [idx, code] of Object.entries(entry)) {
        if (typeof code === 'string' && code.length > 0) {
          upgradedEntry[Number(idx)] = [code];
        }
      }
      if (Object.keys(upgradedEntry).length > 0) {
        upgraded[orderId] = upgradedEntry;
      }
    }

    if (Object.keys(upgraded).length > 0) {
      setMap(upgraded);
    }
    window.localStorage.removeItem(LEGACY_KEY);
  } catch (err) {
    console.warn('Failed to migrate legacy location assignments:', err);
  }
}

export function useOrderLocations() {
  const [map, setMap] = useLocalStorage<LocationMap>(STORAGE_KEY, {});
  const [migrated, setMigrated] = useState(false);

  useEffect(() => {
    if (migrated) return;
    migrateV1IfNeeded(setMap, Object.keys(map).length === 0);
    setMigrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getLocationsFor = useCallback(
    (orderId: string | undefined): Record<number, string[]> => {
      if (!orderId) return {};
      return map[orderId] || {};
    },
    [map]
  );

  const getLocations = useCallback(
    (orderId: string | undefined, index: number): string[] => {
      if (!orderId) return [];
      return map[orderId]?.[index] ?? [];
    },
    [map]
  );

  // Used by the modal's Submit. Replaces all entries for one order at once.
  const setDraft = useCallback(
    (orderId: string, draft: Record<number, string[]>) => {
      setMap(prev => {
        const next = { ...prev };
        const cleaned: Record<number, string[]> = {};
        for (const [idx, codes] of Object.entries(draft)) {
          if (Array.isArray(codes) && codes.length > 0) {
            // De-dupe while preserving order
            cleaned[Number(idx)] = Array.from(new Set(codes));
          }
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
    getLocations,
    setDraft,
    clearLocation,
    clearOrder,
    clearAll,
  };
}
