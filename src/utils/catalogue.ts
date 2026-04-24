import { OrderProduct, Product, ProductType } from '@/types';

// Map the narrower manualDetails.type (which includes 'Unknown') onto the
// catalogue's ProductType enum. Anything we can't place (i.e. 'Unknown')
// returns undefined so the catalogue row leaves the Type column empty for
// the user to pick.
const mapManualTypeToCatalogue = (
  manualType: NonNullable<OrderProduct['manualDetails']>['type'] | undefined
): ProductType | undefined => {
  if (manualType === 'Batt' || manualType === 'Roll' || manualType === 'Board' || manualType === 'Pallet') {
    return manualType;
  }
  return undefined;
};

/**
 * Build a prefilled catalogue row from an order-line that isn't in the
 * catalogue yet (either AI-detected "Unknown Product" lines, or rows the
 * user annotated via Product details form). We do a light best-effort parse
 * of the description to pull R-value and width out of the free text, then
 * seed the rest from the order line. The user still reviews and can edit
 * every column in the modal before saving — so the goal here is "save a
 * few keystrokes", not "be perfect".
 */
export function seedCatalogueRowFromOrderProduct(
  orderProduct: OrderProduct
): Partial<Product> {
  const details = orderProduct.manualDetails;
  let remaining = (details?.description ?? '').trim();

  // R-value: matches things like "R8.0", "R2.7", "R 4.1" (case-insensitive).
  const rMatch = remaining.match(/\bR\s*(\d+(?:\.\d+)?)\b/i);
  const rValue = rMatch?.[1] ?? '';
  if (rMatch) remaining = remaining.replace(rMatch[0], ' ');

  // Width: trailing 3–4 digits followed by "mm" e.g. "580mm", "430 mm".
  const widthMatch = remaining.match(/\b(\d{3,4})\s*mm\b/i);
  const width = widthMatch?.[1] ?? '';
  if (widthMatch) remaining = remaining.replace(widthMatch[0], ' ');

  // Whatever text is left becomes the human-readable category (e.g.
  // "Pink Batts"). Collapse whitespace that the extractions left behind.
  const category = remaining.replace(/\s+/g, ' ').trim();

  // packsPerBale defaults to 1 for Unknown lines so the catalogue row
  // validates out of the box (validateRows requires > 0). Manually-described
  // rows keep whatever the user entered if it's a sane positive number.
  const seededPacksPerBale =
    typeof details?.packsPerBale === 'number' && details.packsPerBale > 0
      ? details.packsPerBale
      : 1;

  return {
    category,
    rValue,
    newCode: orderProduct.productCode ?? '',
    oldCode: details?.secondaryCode ?? '',
    packsPerBale: seededPacksPerBale,
    width,
    type: mapManualTypeToCatalogue(details?.type),
  };
}
