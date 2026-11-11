import { Order, OrderProduct, Product } from '@/types';
import { convertToOutput, getOutputUnit, getProductDetails } from '@/utils';
import { isBattType } from './catalogue';

export type OrderStats = {
  orders: number;
  destinations: number;
  packs: number;
  bales: number;
  destinationCounts: Array<{ name: string; count: number }>;
};

export function computeBattBales(products: OrderProduct[], productData: Product[]): number {
  let total = 0;

  for (const line of products) {
    const catalogueType = getProductDetails(line.productCode, productData)?.type;
    if (!isBattType(catalogueType || line.manualDetails?.type)) continue;

    const packs = parseFloat(line.packsOrdered);
    if (!Number.isFinite(packs) || packs <= 0) continue;

    const manualBaleSize = line.manualDetails?.packsPerBale || 1;
    const bales = catalogueType
      ? convertToOutput(line.productCode, line.packsOrdered, productData)
      : Number((packs / manualBaleSize).toFixed(1));

    if (typeof bales === 'number' && Number.isFinite(bales) && bales > 0) {
      total += bales;
    }
  }

  return Number(total.toFixed(1));
}

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
