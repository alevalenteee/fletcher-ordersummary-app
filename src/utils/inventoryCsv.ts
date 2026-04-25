/**
 * Parse warehouse inventory CSV (Storage Bin, Product, Quantity, Base unit of Measure)
 * and normalise storage-bin codes to app `Location.code` values.
 */

export interface ParsedInventoryRow {
  location_code: string;
  product_code: string;
  quantity: number;
}

export interface InventoryCsvSkipped {
  blank: number;
  unknownLocation: number;
  invalidQuantity: number;
}

export interface ParseInventoryCsvResult {
  rows: ParsedInventoryRow[];
  skipped: InventoryCsvSkipped;
  /** Fatal parse errors (missing headers, empty file, etc.) */
  errors: string[];
}

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export const INVENTORY_EXPIRY_MS = TWELVE_HOURS_MS;

/** Split one CSV line into fields (RFC 4180-style quoted fields). */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

function normaliseHeaderKey(h: string): string {
  return h.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Map raw storage-bin text from the CSV to an app location code, or null if unmapped.
 */
export function normaliseInventoryLocation(raw: string): string | null {
  const compact = raw.trim().toUpperCase().replace(/\s+/g, '');
  if (!compact) return null;

  if (compact === 'AWNSTAGING') return 'AWNSTAGING';
  if (compact === 'FABSTAGING') return 'FABSTAGING';
  if (compact === 'FABFOIL') return 'FABFOIL';
  if (compact === 'XDOCK') return 'XDOCK';

  if (/^GR2\d{2}[A-Z]$/.test(compact)) {
    const letter = compact[compact.length - 1];
    return `GR2-${letter}`;
  }

  if (/^FAB\d{2}[A-Z]$/.test(compact)) {
    const letter = compact[compact.length - 1];
    return `FAB-${letter}`;
  }

  if (/^AWN\d{2}[A-Z]$/.test(compact)) return 'AWNING';
  if (compact.startsWith('AWN') && compact !== 'AWNSTAGING') return 'AWNING';

  return null;
}

function findColumnIndex(
  headers: string[],
  canonical: 'storageBin' | 'product' | 'quantity'
): number {
  const requiredLabels: Record<string, string[]> = {
    storageBin: ['storage bin', 'location'],
    product: ['product', 'code', 'product code'],
    quantity: ['quantity', 'qty'],
  };
  const wanted = requiredLabels[canonical];
  for (let i = 0; i < headers.length; i++) {
    const nk = normaliseHeaderKey(headers[i]);
    for (const w of wanted) {
      if (nk === w) return i;
    }
  }
  return -1;
}

/**
 * Parse inventory CSV text. Storage Bin, Product, Quantity are required.
 * Base unit of Measure is tolerated but ignored (quantities are always trusted).
 */
export function parseInventoryCsv(csvText: string): ParseInventoryCsvResult {
  const skipped: InventoryCsvSkipped = {
    blank: 0,
    unknownLocation: 0,
    invalidQuantity: 0,
  };
  const errors: string[] = [];
  const rows: ParsedInventoryRow[] = [];

  const text = csvText.replace(/^\uFEFF/, '');
  const lines = text.split(/\r\n|\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) {
    errors.push('CSV is empty.');
    return { rows, skipped, errors };
  }

  const headerCells = splitCsvLine(lines[0]);
  const idxBin = findColumnIndex(headerCells, 'storageBin');
  const idxProduct = findColumnIndex(headerCells, 'product');
  const idxQty = findColumnIndex(headerCells, 'quantity');

  const missing: string[] = [];
  if (idxBin < 0) missing.push('Storage Bin (or Location)');
  if (idxProduct < 0) missing.push('Product (or Code)');
  if (idxQty < 0) missing.push('Quantity (or Qty)');
  if (missing.length > 0) {
    errors.push(`Missing required column(s): ${missing.join(', ')}.`);
    return { rows, skipped, errors };
  }

  for (let li = 1; li < lines.length; li++) {
    const cells = splitCsvLine(lines[li]);
    const binRaw = cells[idxBin] ?? '';
    const productRaw = cells[idxProduct] ?? '';
    const qtyRaw = cells[idxQty] ?? '';

    if (!binRaw.trim() && !productRaw.trim() && !qtyRaw.trim()) {
      skipped.blank++;
      continue;
    }

    const loc = normaliseInventoryLocation(binRaw);
    if (!loc) {
      skipped.unknownLocation++;
      continue;
    }

    const cleanedQty = String(qtyRaw).replace(/,/g, '').trim();
    const qtyNum = Number(cleanedQty);
    if (!Number.isFinite(qtyNum) || qtyNum < 0) {
      skipped.invalidQuantity++;
      continue;
    }
    const qty = Math.trunc(qtyNum);
    if (qty === 0) {
      // Empty bin for this product — no inventory to track.
      skipped.blank++;
      continue;
    }

    const product_code = productRaw.trim();
    if (!product_code) {
      skipped.blank++;
      continue;
    }

    rows.push({ location_code: loc, product_code, quantity: qty });
  }

  return { rows, skipped, errors };
}
