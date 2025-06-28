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
    type: 'Batt' | 'Roll' | 'Board' | 'Pallet' | 'Unknown';
    packsPerBale?: number;
    secondaryCode?: string;
  };
}

export interface Profile {
  id: string;
  name: string;
  color: string;
  is_default: boolean;
  created_at?: string;
}

export interface Order {
  id?: string;
  destination: string;
  time: string;
  manifestNumber?: string;
  transportCompany?: string;
  trailerType?: string;
  trailerSize?: string;
  products: OrderProduct[];
  user_id?: string;
  created_at?: string;
  profile_id?: string;
}

export interface ProductDetails extends Product {
  outputUnit: string;
  output: string | number;
}