import { Order, Product } from '@/types';
import { getProductDetails, convertToOutput, getOutputUnit } from '@/utils';
import * as XLSX from 'xlsx';

const HEADERS = [
  'Destination',
  'Time',
  'Manifest Number',
  'Transport Company',
  'Product',
  'Code',
  'Old Code',
  'Packs',
  'Output'
];

export const convertOrdersToExcel = (orders: Order[], productData: Product[]): XLSX.WorkBook => {
  const rows: any[] = [];
  
  // Add order data
  orders.forEach(order => {
    let isFirstProduct = true;
    
    order.products.forEach((product) => {
      const details = getProductDetails(product.productCode, productData);
      const output = convertToOutput(product.productCode, product.packsOrdered, productData);
      const outputUnit = getOutputUnit(product.productCode, productData);
      
      // Format product name
      let productName = '';
      if (details) {
        productName = `${details.category} ${details.rValue}${details.width ? ` (${details.width})` : ''}`;
      } else if (product.manualDetails) {
        productName = `${product.manualDetails.category}${product.manualDetails.description ? ` - ${product.manualDetails.description}` : ''}`;
      }
      
      rows.push({
        Destination: isFirstProduct ? order.destination : '',
        Time: isFirstProduct ? order.time : '',
        'Manifest Number': isFirstProduct ? (order.manifestNumber || '') : '',
        'Transport Company': isFirstProduct ? (order.transportCompany || '') : '',
        Product: productName,
        Code: product.productCode,
        'Old Code': details?.oldCode || '',
        Packs: product.packsOrdered,
        Output: `${output} ${outputUnit}`
      });
      
      isFirstProduct = false;
    });
    
    // Add blank row between orders for readability
    rows.push({});
  });

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: HEADERS });
  
  // Set column widths
  const columnWidths = {
    A: 20, // Destination
    B: 10, // Time
    C: 15, // Manifest Number
    D: 20, // Transport Company
    E: 30, // Product
    F: 15, // Code
    G: 15, // Old Code
    H: 10, // Packs
    I: 15  // Output
  };
  
  worksheet['!cols'] = Object.entries(columnWidths).map(([_, width]) => ({ width }));

  // Apply cell styles
  // Make headers bold
  HEADERS.forEach((_, index) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: index });
    if (!worksheet[cellRef]) worksheet[cellRef] = { v: HEADERS[index] };
    worksheet[cellRef].s = { font: { bold: true } };
  });

  // Make Output column bold
  for (let i = 1; i <= rows.length; i++) {
    const outputCellRef = XLSX.utils.encode_cell({ r: i, c: 8 }); // Column I (Output)
    if (worksheet[outputCellRef] && worksheet[outputCellRef].v) {
      worksheet[outputCellRef].s = { font: { bold: true } };
    }
  }

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

  return workbook;
};

export const downloadExcel = (orders: Order[], productData: Product[]) => {
  const workbook = convertOrdersToExcel(orders, productData);
  const date = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `orders_${date}.xlsx`);
}; 