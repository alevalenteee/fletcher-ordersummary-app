import { Product } from './types';

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

export const getProductDetails = (code: string, productData: Product[]): Product | undefined => {
  return productData.find(p => 
    p.newCode === code || (!code.startsWith('40') && p.oldCode === code)
  );
};

export const formatRValue = (rValue: string): string => {
  if (!rValue || rValue === "N/A") return '';
  const numericValue = parseFloat(rValue);
  return !isNaN(numericValue) ? `R${rValue}` : '';
};

export const convertToOutput = (code: string, packs: string, productData: Product[]): string | number => {
  const product = getProductDetails(code, productData);
  if (!product) return packs;
  
  const packsNum = parseFloat(packs);
  const baleSize = parseInt(String(product.packsPerBale));
  
  if (isNaN(packsNum) || packsNum <= 0) return 'Invalid packs';
  if (isNaN(baleSize) || baleSize <= 0) return 'Invalid bale size';
  
  if (baleSize === 1) return packsNum;
  
  const bales = packsNum / baleSize;
  return Number.isInteger(bales) ? bales : Number(bales.toFixed(1));
};

export const getOutputUnit = (code: string, productData: Product[]): string => {
  const product = getProductDetails(code, productData);
  if (!product || !product.packsPerBale) return 'Packs';
  return parseInt(String(product.packsPerBale)) === 1 ? 'Units' : 'Bales';
};