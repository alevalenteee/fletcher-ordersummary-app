import { Destination } from '@/types';

/**
 * Curated palette used for destination accent bars/dots. Twelve muted-yet-
 * distinct tones chosen for legibility on white and on paper. Slugs are
 * stored (not hex) so rows stay portable and we can swap shades later
 * without a data migration.
 */
export type PaletteSlug =
  | 'indigo'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'violet'
  | 'orange'
  | 'teal'
  | 'fuchsia'
  | 'sky'
  | 'lime'
  | 'slate';

export const PALETTE_SLUGS: PaletteSlug[] = [
  'indigo',
  'emerald',
  'amber',
  'rose',
  'cyan',
  'violet',
  'orange',
  'teal',
  'fuchsia',
  'sky',
  'lime',
  'slate',
];

type Swatch = { bar: string; soft: string; label: string };

// Hand-picked Tailwind-ish 500/100 pairs. `bar` is the strong accent used on
// the 3px card edge; `soft` is the translucent tint used for subtle
// backgrounds (e.g. Must Go cells, dot halos).
const SWATCHES: Record<PaletteSlug, Swatch> = {
  indigo: { bar: '#6366F1', soft: 'rgba(99, 102, 241, 0.10)', label: 'Indigo' },
  emerald: { bar: '#10B981', soft: 'rgba(16, 185, 129, 0.10)', label: 'Emerald' },
  amber: { bar: '#F59E0B', soft: 'rgba(245, 158, 11, 0.12)', label: 'Amber' },
  rose: { bar: '#F43F5E', soft: 'rgba(244, 63, 94, 0.10)', label: 'Rose' },
  cyan: { bar: '#06B6D4', soft: 'rgba(6, 182, 212, 0.10)', label: 'Cyan' },
  violet: { bar: '#8B5CF6', soft: 'rgba(139, 92, 246, 0.10)', label: 'Violet' },
  orange: { bar: '#F97316', soft: 'rgba(249, 115, 22, 0.10)', label: 'Orange' },
  teal: { bar: '#14B8A6', soft: 'rgba(20, 184, 166, 0.10)', label: 'Teal' },
  fuchsia: { bar: '#D946EF', soft: 'rgba(217, 70, 239, 0.10)', label: 'Fuchsia' },
  sky: { bar: '#0EA5E9', soft: 'rgba(14, 165, 233, 0.10)', label: 'Sky' },
  lime: { bar: '#65A30D', soft: 'rgba(101, 163, 13, 0.12)', label: 'Lime' },
  slate: { bar: '#64748B', soft: 'rgba(100, 116, 139, 0.10)', label: 'Slate' },
};

export type DestinationAccent = {
  bar: string;
  soft: string;
  dot: string;
  key: PaletteSlug;
  label: string;
};

export function getPaletteSwatch(slug: PaletteSlug): Swatch {
  return SWATCHES[slug];
}

// Simple djb2 hash — stable across sessions/browsers and plenty for a 12-slot
// palette. Case-insensitive + whitespace-collapsed so "Banyo" and "banyo "
// resolve to the same swatch.
function hashName(name: string): number {
  const normalised = name.trim().toLowerCase().replace(/\s+/g, ' ');
  let hash = 5381;
  for (let i = 0; i < normalised.length; i++) {
    hash = ((hash << 5) + hash + normalised.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function isPaletteSlug(value: unknown): value is PaletteSlug {
  return typeof value === 'string' && (PALETTE_SLUGS as string[]).includes(value);
}

/**
 * Resolve an accent for a destination name. If the destination exists in the
 * table and has a stored palette slug, use that. Otherwise fall back to a
 * deterministic hash of the name so unknown destinations still get a stable
 * colour.
 */
export function getDestinationAccent(
  destinationName: string | undefined | null,
  destinations: Destination[] = []
): DestinationAccent {
  const name = (destinationName ?? '').trim();
  if (!name) {
    const swatch = SWATCHES.slate;
    return { bar: swatch.bar, soft: swatch.soft, dot: swatch.bar, key: 'slate', label: swatch.label };
  }

  const lower = name.toLowerCase();
  const match = destinations.find(d => d.name.trim().toLowerCase() === lower);
  let slug: PaletteSlug;
  if (match && isPaletteSlug(match.color)) {
    slug = match.color;
  } else {
    slug = PALETTE_SLUGS[hashName(name) % PALETTE_SLUGS.length];
  }
  const swatch = SWATCHES[slug];
  return { bar: swatch.bar, soft: swatch.soft, dot: swatch.bar, key: slug, label: swatch.label };
}
