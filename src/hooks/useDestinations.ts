import { useEffect, useState } from 'react';
import { Destination } from '@/types';
import { supabase } from '@/lib/supabase';

// Mirrors the list that used to be hardcoded in OrderForm.tsx and gemini.ts.
// Also seeded by the migration; this is a safety net if the table is empty.
const DEFAULT_DESTINATIONS = [
  'ARNDELL', 'BANYO', 'SALISBURY', 'DERRIMUT', 'MOONAH',
  'JANDAKOT', 'GEPPS CROSS', 'BARON', 'SHEPPARTON', 'EE-FIT', 'CANBERRA'
];

export function useDestinations() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDestinations();
  }, []);

  const fetchDestinations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('destinations')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        const { data: seeded, error: seedError } = await supabase
          .from('destinations')
          .insert(DEFAULT_DESTINATIONS.map(name => ({ name })))
          .select();

        if (seedError) throw seedError;
        setDestinations(seeded || []);
      } else {
        setDestinations(data);
      }
    } catch (err) {
      console.error('Error fetching destinations:', err);
      setError('Failed to fetch destinations');
    } finally {
      setLoading(false);
    }
  };

  const createDestination = async (name: string) => {
    const trimmed = name.trim().toUpperCase();
    if (!trimmed) {
      const msg = 'Destination name cannot be empty';
      setError(msg);
      throw new Error(msg);
    }

    if (destinations.some(d => d.name === trimmed)) {
      const msg = `"${trimmed}" already exists`;
      setError(msg);
      throw new Error(msg);
    }

    try {
      const { data, error } = await supabase
        .from('destinations')
        .insert({ name: trimmed })
        .select()
        .single();

      if (error) throw error;

      setDestinations(prev => [...prev, data]);
      setError(null);
      return data as Destination;
    } catch (err) {
      console.error('Error creating destination:', err);
      const message = err instanceof Error ? err.message : 'Failed to create destination';
      setError(message);
      throw err;
    }
  };

  const deleteDestination = async (id: string) => {
    try {
      const { error } = await supabase
        .from('destinations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDestinations(prev => prev.filter(d => d.id !== id));
      setError(null);
    } catch (err) {
      console.error('Error deleting destination:', err);
      setError('Failed to delete destination');
      throw err;
    }
  };

  // Store a palette slug (e.g. "emerald") or null to clear the override and
  // fall back to the hash-derived colour. We update optimistically so the UI
  // feels instant and roll back on error.
  const updateDestinationColor = async (id: string, color: string | null) => {
    const previous = destinations.find(d => d.id === id);
    setDestinations(prev =>
      prev.map(d => (d.id === id ? { ...d, color: color ?? undefined } : d))
    );
    try {
      const { error } = await supabase
        .from('destinations')
        .update({ color })
        .eq('id', id);
      if (error) throw error;
      setError(null);
    } catch (err) {
      console.error('Error updating destination colour:', err);
      if (previous) {
        setDestinations(prev => prev.map(d => (d.id === id ? previous : d)));
      }
      setError('Failed to update destination colour');
      throw err;
    }
  };

  return {
    destinations,
    loading,
    error,
    createDestination,
    deleteDestination,
    updateDestinationColor
  };
}
