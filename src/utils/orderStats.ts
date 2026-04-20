import { Order, Product } from '@/types';
import { convertToOutput, getOutputUnit } from '@/utils';

export type OrderStats = {
  orders: number;
  destinations: number;
  packs: number;
  bales: number;
  destinationCounts: Array<{ name: string; count: number }>;
};

/**
 * Aggregate order-list totals for the Today-at-a-Glance strip. Bale counting
 * mirrors the logic inside ProductOutput so the strip never disagrees with
 * what each row displays:
 *
 * - manualDetails Batt/Roll lines → packs / packsPerBale (or packs if no bale size)
 * - catalogue lines with packsPerBale > 1 → convertToOutput()
 * - everything else contributes to packs but not bales
 */
export function computeOrderStats(orders: Order[], productData: Product[]): OrderStats {
  let packs = 0;
  let bales = 0;
  const destCounts = new Map<string, number>();

  for (const order of orders) {
    const name = (order.destination || '').trim();
    if (name) destCounts.set(name, (destCounts.get(name) ?? 0) + 1);

    for (const line of order.products ?? []) {
      const parsed = parseFloat(line.packsOrdered);
      if (Number.isFinite(parsed) && parsed > 0) {
        packs += parsed;
      }

      if (line.manualDetails) {
        const { type, packsPerBale } = line.manualDetails;
        if ((type === 'Batt' || type === 'Roll') && Number.isFinite(parsed) && parsed > 0) {
          const baleSize = typeof packsPerBale === 'number' && packsPerBale > 0 ? packsPerBale : 1;
          bales += parsed / baleSize;
        }
        continue;
      }

      const unit = getOutputUnit(line.productCode, productData);
      if (unit !== 'Bales') continue;
      const out = convertToOutput(line.productCode, line.packsOrdered, productData);
      if (typeof out === 'number' && Number.isFinite(out)) {
        bales += out;
      }
    }
  }

  const destinationCounts = Array.from(destCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    orders: orders.length,
    destinations: destinationCounts.length,
    packs: Math.round(packs),
    bales: Math.round(bales * 10) / 10,
    destinationCounts,
  };
}
