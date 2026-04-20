import { Location, LocationGroup } from '@/types';

const GROUP_ORDER: LocationGroup[] = ['AWNING', 'GR2', 'FABRICATION'];

// Render a list of location codes for display.
//
// Rules:
// - Codes are grouped by their Location.group and emitted in GROUP_ORDER.
// - Within a group, codes are sorted by sort_order.
// - The first code in a group is written in full. Subsequent codes in the
//   same group have the shared prefix (everything up to and including the
//   last `-`) stripped. For codes with no `-`, nothing is stripped.
// - Codes with no matching Location entry are silently dropped.
//
// Examples:
//   ['GR2-A', 'GR2-G']           -> "GR2-A, G"
//   ['GR2-B', 'FAB-N']           -> "GR2-B, FAB-N"
//   ['GR2-A', 'GR2-C', 'FAB-N']  -> "GR2-A, C, FAB-N"
//   ['AWNING', 'XDOCK']          -> "AWNING, XDOCK"
export function formatLocationCodes(
  codes: string[] | undefined,
  locations: Location[]
): string {
  if (!codes || codes.length === 0) return '';

  const byCode = new Map<string, Location>();
  for (const loc of locations) byCode.set(loc.code, loc);

  const buckets = new Map<LocationGroup, Location[]>();
  for (const group of GROUP_ORDER) buckets.set(group, []);

  for (const code of codes) {
    const loc = byCode.get(code);
    if (!loc) continue;
    buckets.get(loc.group)?.push(loc);
  }

  const parts: string[] = [];
  for (const group of GROUP_ORDER) {
    const items = buckets.get(group)!;
    if (items.length === 0) continue;
    items.sort((a, b) => a.sort_order - b.sort_order);

    const first = items[0].code;
    parts.push(first);

    const dashIdx = first.lastIndexOf('-');
    const prefix = dashIdx >= 0 ? first.slice(0, dashIdx + 1) : '';

    for (let i = 1; i < items.length; i++) {
      const c = items[i].code;
      if (prefix && c.startsWith(prefix)) {
        parts.push(c.slice(prefix.length));
      } else {
        parts.push(c);
      }
    }
  }

  return parts.join(', ');
}

// Return true if any of the given codes is in the AWNING group.
export function hasAwningCode(
  codes: string[] | undefined,
  locations: Location[]
): boolean {
  if (!codes || codes.length === 0) return false;
  const awningSet = new Set(
    locations.filter(l => l.group === 'AWNING').map(l => l.code)
  );
  return codes.some(c => awningSet.has(c));
}

// Filter out AWNING-group codes. Used for the CODE column, which only shows
// non-AWNING codes (AWNING is represented by `(A)` in the OUTPUT column).
export function stripAwningCodes(
  codes: string[] | undefined,
  locations: Location[]
): string[] {
  if (!codes || codes.length === 0) return [];
  const awningSet = new Set(
    locations.filter(l => l.group === 'AWNING').map(l => l.code)
  );
  return codes.filter(c => !awningSet.has(c));
}
