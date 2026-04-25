import type {
  AutoAssignStockWarning,
  InventoryRow,
  Location,
  LocationGroup,
  Order,
  OrderProduct,
  Product,
} from '@/types';
import { getProductDetails } from '@/utils';
import { sortOrdersByTime } from '@/utils/time';

export interface AutoAssignInput {
  orders: Order[];
  inventory: InventoryRow[];
  productData: Product[];
  locations: Location[];
}

export interface AutoAssignOutput {
  /** orderId → productIndex → location codes (max 3) */
  assignments: Record<string, Record<number, string[]>>;
  warnings: AutoAssignStockWarning[];
}

const GROUP_ORDER: LocationGroup[] = ['AWNING', 'GR2', 'FABRICATION'];

function sortCodesByLocationOrder(codes: string[], locations: Location[]): string[] {
  const byCode = new Map(locations.map(l => [l.code, l]));
  return [...new Set(codes)].sort((a, b) => {
    const la = byCode.get(a);
    const lb = byCode.get(b);
    const ga = (la?.group ?? 'GR2') as LocationGroup;
    const gb = (lb?.group ?? 'GR2') as LocationGroup;
    const ia = GROUP_ORDER.indexOf(ga);
    const ib = GROUP_ORDER.indexOf(gb);
    if (ia !== ib) return ia - ib;
    return (la?.sort_order ?? 0) - (lb?.sort_order ?? 0);
  });
}

/** Match key: catalogue `newCode` only (uppercased), or raw order code if unknown product. */
function matchCodeForLine(product: OrderProduct, productData: Product[]): string {
  const details = getProductDetails(product.productCode, productData);
  if (details?.newCode?.trim()) return details.newCode.trim().toUpperCase();
  return product.productCode.trim().toUpperCase();
}

/** Deep copy of reservation: location → productCode (upper) → qty */
function buildReservation(inventory: InventoryRow[]): Map<string, Map<string, number>> {
  const m = new Map<string, Map<string, number>>();
  for (const row of inventory) {
    const loc = row.location_code;
    const code = row.product_code.trim().toUpperCase();
    const qty = row.quantity;
    if (!m.has(loc)) m.set(loc, new Map());
    const inner = m.get(loc)!;
    inner.set(code, (inner.get(code) ?? 0) + qty);
  }
  return m;
}

function takeFrom(res: Map<string, Map<string, number>>, loc: string, code: string, amount: number): number {
  const inner = res.get(loc);
  if (!inner) return 0;
  const cur = inner.get(code) ?? 0;
  const taken = Math.min(cur, amount);
  if (taken <= 0) return 0;
  inner.set(code, cur - taken);
  return taken;
}

/**
 * Largest-first greedy allocation, max 3 distinct locations per line, time-ordered orders
 * consume reservations first.
 */
export function autoAssignLocations(input: AutoAssignInput): AutoAssignOutput {
  const { inventory, productData, locations } = input;
  const sortedOrders = sortOrdersByTime(input.orders.filter(o => o.id));
  const reservation = buildReservation(inventory);
  const groupByCode = new Map(locations.map(l => [l.code, l.group]));

  const assignments: Record<string, Record<number, string[]>> = {};
  const warnings: AutoAssignStockWarning[] = [];

  for (const order of sortedOrders) {
    const oid = order.id as string;
    assignments[oid] = {};

    order.products.forEach((product, productIndex) => {
      const matchCode = matchCodeForLine(product, productData);
      const requested = parseInt(String(product.packsOrdered).replace(/,/g, '').trim(), 10);

      if (!Number.isFinite(requested) || requested <= 0) {
        assignments[oid][productIndex] = [];
        return;
      }

      let need = requested;
      const pickedLocs: string[] = [];
      const takenByLoc = new Map<string, number>();

      // Pick the location with the largest available qty for this product, but
      // prefer AWNING locations first — only fall back to non-AWNING once no
      // AWNING location has any stock left. Within each tier, biggest qty wins.
      while (need > 0 && pickedLocs.length < 3) {
        let bestAwningLoc: string | null = null;
        let bestAwningQty = 0;
        let bestOtherLoc: string | null = null;
        let bestOtherQty = 0;

        for (const [loc, pmap] of reservation) {
          const q = pmap.get(matchCode) ?? 0;
          if (q <= 0) continue;
          const isAwning = groupByCode.get(loc) === 'AWNING';
          if (isAwning) {
            if (q > bestAwningQty) {
              bestAwningQty = q;
              bestAwningLoc = loc;
            }
          } else if (q > bestOtherQty) {
            bestOtherQty = q;
            bestOtherLoc = loc;
          }
        }

        const bestLoc = bestAwningLoc ?? bestOtherLoc;
        const bestQty = bestAwningLoc ? bestAwningQty : bestOtherQty;
        if (!bestLoc || bestQty <= 0) break;

        const take = Math.min(bestQty, need);
        const taken = takeFrom(reservation, bestLoc, matchCode, take);
        if (taken <= 0) break;
        need -= taken;
        if (!pickedLocs.includes(bestLoc)) pickedLocs.push(bestLoc);
        takenByLoc.set(bestLoc, (takenByLoc.get(bestLoc) ?? 0) + taken);
      }

      const codes = sortCodesByLocationOrder(pickedLocs, locations);
      assignments[oid][productIndex] = codes;

      const fulfilled = requested - need;
      if (fulfilled < requested) {
        warnings.push({
          orderId: oid,
          productIndex,
          productCode: product.productCode,
          requested,
          available: fulfilled,
          breakdown: codes.map(code => ({ code, quantity: takenByLoc.get(code) ?? 0 })),
        });
      }
    });
  }

  return { assignments, warnings };
}
