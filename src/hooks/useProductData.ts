import { useState, useEffect } from 'react';
import { Product } from '@/types';
import { defaultProductData } from '@/data/defaultProducts';
import { supabase } from '@/lib/supabase';

export function useProductData() {
  const [productData, setProductData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data from Supabase on mount
  useEffect(() => {
    const fetchProductData = async () => {
      try {
        // First, check if we need to initialize with default data
        const { data, error } = await supabase
          .from('product_data')
          .select('*');

        if (error) throw error;

        if (!data || data.length === 0) {
          // No data exists, initialize with defaults
          await saveAsDefault(defaultProductData);
          setProductData(defaultProductData);
        } else {
          // Use the most recent data
          const mostRecent = data.reduce((latest, current) => 
            latest.updated_at > current.updated_at ? latest : current
          );
          setProductData(mostRecent.data);
        }
      } catch (err) {
        console.error('Error loading product data:', err);
        setError('Failed to load product data');
        setProductData(defaultProductData);
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, []);

  const handleDataLoaded = (data: Product[]) => {
    setProductData(data);
  };

  const saveAsDefault = async (data: Product[]) => {
    try {
      const { error } = await supabase
        .from('product_data')
        .insert({ data })
        .select();

      if (error) throw error;
      setProductData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save product data';
      console.error('Error saving product data:', message);
      setError(message);
      throw err;
    }
  };

  return {
    productData,
    loading,
    error,
    handleDataLoaded,
    saveAsDefault
  };
}