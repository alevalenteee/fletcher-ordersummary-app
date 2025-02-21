import { Product } from '@/types';

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
      width: row.Width
    }))
    .filter(product => 
      product.category && 
      (product.newCode || product.oldCode) && 
      product.packsPerBale > 0
    );
};