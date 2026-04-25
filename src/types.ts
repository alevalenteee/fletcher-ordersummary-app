export type ProductType = 'Batt' | 'Roll' | 'Pallet' | 'Board' | 'Other';

export const PRODUCT_TYPES: ProductType[] = ['Batt', 'Roll', 'Pallet', 'Board', 'Other'];

export interface Product {
  category: string;
  rValue: string;
  newCode: string;
  oldCode: string;
  packsPerBale: number;
  width: string;
  type?: ProductType;
}

export interface OrderProduct {
  productCode: string;
  packsOrdered: string;
  mustGo?: boolean;
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

export interface Destination {
  id: string;
  name: string;
  color?: string;
  created_at?: string;
}

export type LocationGroup = 'AWNING' | 'GR2' | 'FABRICATION';

export interface Location {
  id: string;
  code: string;
  group: LocationGroup;
  sort_order: number;
  created_at?: string;
}

/** One row from the inventory CSV / Supabase `inventory` table (quantities in packs). */
export interface InventoryRow {
  id: string;
  location_code: string;
  product_code: string;
  quantity: number;
  uploaded_at: string;
}

/** Emitted when ordered packs exceed available packs across assigned locations. */
export interface AutoAssignStockWarning {
  orderId: string;
  productIndex: number;
  productCode: string;
  requested: number;
  available: number;
  /**
   * Per-bin contribution toward `available`, in the order picks were made.
   * Lets the UI surface "which bins hold what" for the short line.
   */
  breakdown: Array<{ code: string; quantity: number }>;
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
  /**
   * Per-line bin assignments persisted alongside the order so they sync
   * across devices. Keys are stringified product indices (matching the
   * order's `products[]`), values are arrays of location codes.
   */
  locations?: Record<number, string[]>;
  user_id?: string;
  created_at?: string;
  profile_id?: string;
}

export interface ProductDetails extends Product {
  outputUnit: string;
  output: string | number;
}