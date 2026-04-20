import { useEffect, useState } from 'react';
import { Location, LocationGroup } from '@/types';
import { supabase } from '@/lib/supabase';

// Safety-net seed if the `locations` table comes back empty.
// Source of truth is the migration 20260419000001_create_locations.sql.
const DEFAULT_LOCATIONS: Array<{ code: string; group: LocationGroup; sort_order: number }> = [
  { code: 'AWNING', group: 'AWNING', sort_order: 1 },
  { code: 'XDOCK', group: 'AWNING', sort_order: 2 },
  ...'ABCDEFGHIJKLMNOPQRSTU'.split('').map((l, i) => ({
    code: `GR2-${l}`,
    group: 'GR2' as const,
    sort_order: i + 1,
  })),
  ...'ABCDEFGHIJKLMNO'.split('').map((l, i) => ({
    code: `FAB-${l}`,
    group: 'FABRICATION' as const,
    sort_order: i + 1,
  })),
  { code: 'FABFOIL', group: 'FABRICATION', sort_order: 16 },
];

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('group', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        const { data: seeded, error: seedError } = await supabase
          .from('locations')
          .insert(DEFAULT_LOCATIONS)
          .select()
          .order('group', { ascending: true })
          .order('sort_order', { ascending: true });

        if (seedError) throw seedError;
        setLocations((seeded || []) as Location[]);
      } else {
        setLocations(data as Location[]);
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError('Failed to fetch locations');
    } finally {
      setLoading(false);
    }
  };

  return {
    locations,
    loading,
    error,
  };
}
