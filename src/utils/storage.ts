import { Product } from '@/types';

const STORAGE_KEY = 'default_product_data';

export const saveDefaultProducts = (products: Product[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch (error) {
    console.error('Error saving default products:', error);
  }
};

export const loadDefaultProducts = (): Product[] | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error loading default products:', error);
    return null;
  }
};