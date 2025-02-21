export interface Product {
  category: string;
  rValue: string;
  newCode: string;
  oldCode: string;
  packsPerBale: number;
  width: string;
}

export interface OrderProduct {
  productCode: string;
  packsOrdered: string;
  manualDetails?: {
    category: string;
    description: string;
    type: 'Batt' | 'Roll' | 'Board' | 'Pallet';
    packsPerBale?: number;
  };
}

export interface Order {
  id?: string;
  destination: string;
  time: string;
  manifestNumber?: string;
  products: OrderProduct[];
  user_id?: string;
  created_at?: string;
}

export interface ProductDetails extends Product {
  outputUnit: string;
  output: string | number;
}