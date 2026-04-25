import { useCallback, useEffect, useState } from 'react';
import type { InventoryRow } from '@/types';
import { supabase } from '@/lib/supabase';
import { INVENTORY_EXPIRY_MS } from '@/utils/inventoryCsv';
import type { ParsedInventoryRow } from '@/utils/inventoryCsv';

export function useInventory() {
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [uploadedAt, setUploadedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('inventory')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (fetchError) throw fetchError;

      const rows = (data || []) as InventoryRow[];
      if (rows.length === 0) {
        setInventory([]);
        setUploadedAt(null);
        return;
      }

      const newest = rows.reduce((max, r) => {
        const t = new Date(r.uploaded_at).getTime();
        return t > max ? t : max;
      }, 0);

      if (Date.now() - newest > INVENTORY_EXPIRY_MS) {
        const { error: delErr } = await supabase.from('inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (delErr) throw delErr;
        setInventory([]);
        setUploadedAt(null);
        return;
      }

      setInventory(rows);
      setUploadedAt(new Date(newest).toISOString());
    } catch (err) {
      console.error('Error loading inventory:', err);
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
      setInventory([]);
      setUploadedAt(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadInventory();
    }, 0);
    return () => window.clearTimeout(t);
  }, [loadInventory]);

  const clearInventory = useCallback(async () => {
    try {
      setError(null);
      const { error: delErr } = await supabase.from('inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (delErr) throw delErr;
      setInventory([]);
      setUploadedAt(null);
    } catch (err) {
      console.error('Error clearing inventory:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear inventory');
      throw err;
    }
  }, []);

  /** Replace all rows with a new snapshot (single upload batch). */
  const replaceInventory = useCallback(async (parsedRows: ParsedInventoryRow[]) => {
    try {
      setError(null);
      const { error: delErr } = await supabase.from('inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (delErr) throw delErr;

      if (parsedRows.length === 0) {
        setInventory([]);
        setUploadedAt(null);
        return;
      }

      const insertPayload = parsedRows.map(r => ({
        location_code: r.location_code,
        product_code: r.product_code.trim(),
        quantity: r.quantity,
      }));

      const { data, error: insErr } = await supabase.from('inventory').insert(insertPayload).select('*');
      if (insErr) throw insErr;

      const inserted = (data || []) as InventoryRow[];
      setInventory(inserted);
      const newest = inserted.reduce((max, r) => {
        const t = new Date(r.uploaded_at).getTime();
        return t > max ? t : max;
      }, 0);
      setUploadedAt(new Date(newest).toISOString());
    } catch (err) {
      console.error('Error replacing inventory:', err);
      setError(err instanceof Error ? err.message : 'Failed to save inventory');
      throw err;
    }
  }, []);

  return {
    inventory,
    uploadedAt,
    loading,
    error,
    replaceInventory,
    clearInventory,
    reloadInventory: loadInventory,
  };
}
