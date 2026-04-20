import { Product, ProductType, PRODUCT_TYPES } from '@/types';

const CSV_HEADERS = ['Category', 'R-Value', 'NewCode', 'OldCode', 'PacksPerBale', 'Width', 'Type'] as const;

// RFC 4180: wrap a value in quotes (and double any embedded quotes) when it
// contains a comma, quote, CR, or LF. Otherwise emit as-is.
const escapeCSVValue = (value: string | number): string => {
  const str = String(value ?? '');
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const toCSV = (products: Product[]): string => {
  const rows = products.map(p =>
    [p.category, p.rValue, p.newCode, p.oldCode, p.packsPerBale, p.width, p.type ?? '']
      .map(escapeCSVValue)
      .join(',')
  );
  return [CSV_HEADERS.join(','), ...rows].join('\r\n');
};

export const downloadCSV = (products: Product[], filename?: string): void => {
  const csv = toCSV(products);
  // UTF-8 BOM so Excel opens non-ASCII characters correctly.
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = filename ?? `product-data-${date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const isProductType = (v: string): v is ProductType =>
  (PRODUCT_TYPES as string[]).includes(v);

// Case-insensitive mapping: accepts "batt", "BATT", "Batt" etc.
const normaliseType = (raw: string): ProductType | undefined => {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const title = trimmed[0].toUpperCase() + trimmed.slice(1).toLowerCase();
  return isProductType(title) ? title : undefined;
};

export const parseCSV = (csvString: string): Product[] => {
  const lines = csvString.split(/\r\n|\n/).filter(line => line.trim());
  const headers = lines[0].split(',').map(header => header.trim());

  const parsedData = lines.slice(1).map(line => {
    const values = line.split(',').map(value => value.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });

  return parsedData
    .map(row => ({
      category: row.Category,
      rValue: row['R-Value'],
      newCode: row.NewCode,
      oldCode: row.OldCode,
      packsPerBale: parseInt(row.PacksPerBale) || 0,
      width: row.Width,
      type: normaliseType(row.Type),
    }))
    .filter(product =>
      product.category &&
      (product.newCode || product.oldCode) &&
      product.packsPerBale > 0
    );
};
