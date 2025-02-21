import { useState, useEffect } from 'react';
import { Order } from '@/types';
import { supabase } from '@/lib/supabase';

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch orders on mount
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Transform the data to match our Order interface
      const transformedOrders = (data || []).map(order => ({
        ...order,
        manifestNumber: order.manifest_number,
        products: order.products || []
      }));
      
      setOrders(transformedOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSubmit = async (order: Order) => {
    try {
      setIsSubmitting(true);
      let updatedOrder: Order | null = null;

      // Check if this is an update to an existing order (either editing or time update)
      const existingOrder = editingOrder?.id ? editingOrder : 
        orders.find(o => o.id === order.id);

      if (existingOrder?.id) {
        console.log('Updating order with manifest:', order.manifestNumber);
        
        // Update existing order
        const { error } = await supabase
          .from('orders')
          .update({
            destination: order.destination,
            time: order.time,
            manifest_number: order.manifestNumber || null,
            products: order.products
          })
          .eq('id', existingOrder.id);

        if (error) throw error;

        updatedOrder = {
          ...order,
          id: existingOrder.id,
          manifestNumber: order.manifestNumber
        };
        
        setOrders(prev => prev.map(o => 
          o.id === existingOrder.id ? updatedOrder! : o
        ));
      } else {
        console.log('Creating new order with manifest:', order.manifestNumber);
        
        // Create new order
        const { data, error } = await supabase
          .from('orders')
          .insert({
            destination: order.destination,
            time: order.time,
            manifest_number: order.manifestNumber || null,
            products: order.products
          })
          .select('*')
          .single();

        if (error) throw error;

        updatedOrder = {
          ...data,
          manifestNumber: order.manifestNumber || data.manifest_number,
          products: order.products // Ensure products are included
        };
        
        if (updatedOrder) {
          setOrders(prev => [...prev, updatedOrder!]);
        }
      }

      setEditingOrder(null);
    } catch (err) {
      console.error('Error saving order with manifest:', order.manifestNumber, err);
      const message = err instanceof Error ? err.message : 'Failed to save order';
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOrder = (index: number) => {
    setEditingOrder(orders[index]);
  };

  const handleDeleteOrder = async (index: number) => {
    const orderToDelete = orders[index];
    if (!orderToDelete.id) return;

    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderToDelete.id);

      if (error) throw error;

      setOrders(prev => prev.filter((_, i) => i !== index));
    } catch (err) {
      console.error('Error deleting order:', err);
      setError('Failed to delete order');
      throw err;
    }
  };

  // Refresh orders
  const refreshOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error refreshing orders:', err);
      setError('Failed to refresh orders');
    } finally {
      setLoading(false);
    }
  };

  // Save all orders
  const handleSaveOrders = async () => {
    try {
      setIsSubmitting(true);
      
      // Update all orders in the database
      for (const order of orders) {
        if (!order.id) continue;
        
        const { error } = await supabase
          .from('orders')
          .update({
            destination: order.destination,
            time: order.time,
            manifest_number: order.manifestNumber || null,
            products: order.products
          })
          .eq('id', order.id);

        if (error) throw error;
      }
    } catch (err) {
      console.error('Error saving orders:', err);
      setError('Failed to save orders');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    orders,
    editingOrder,
    loading,
    isSubmitting,
    error,
    handleOrderSubmit,
    handleEditOrder,
    handleDeleteOrder,
    refreshOrders,
    handleSaveOrders
  };
}