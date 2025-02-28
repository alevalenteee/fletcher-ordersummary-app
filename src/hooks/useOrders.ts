import { useState, useEffect } from 'react';
import { Order } from '@/types';
import { supabase } from '@/lib/supabase';

export function useOrders(profileId?: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch orders when profile changes
  useEffect(() => {
    fetchOrders(profileId);
  }, [profileId]);

  const fetchOrders = async (currentProfileId?: string) => {
    try {
      setLoading(true);
      
      // Start building the query
      let query = supabase
        .from('orders')
        .select('*');
      
      // If a profile ID is provided, filter orders by that profile
      if (currentProfileId) {
        query = query.eq('profile_id', currentProfileId);
      }
      
      // Execute the query with sorting
      const { data, error } = await query.order('created_at', { ascending: true });

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
        // Ensure products is properly formatted as a valid JSON object
        const productsArray = Array.isArray(order.products) ? order.products : [];
        
        // Create an object for the update, conditionally including profile_id
        const updateData: any = {
          destination: order.destination,
          time: order.time,
          manifest_number: order.manifestNumber || null,
          products: JSON.parse(JSON.stringify(productsArray)) // Ensure clean JSON
        };
        
        // Only include profile_id if it's defined
        if (order.profile_id || profileId) {
          updateData.profile_id = order.profile_id || profileId;
        }
        
        // Update existing order
        const { error } = await supabase
          .from('orders')
          .update(updateData)
          .eq('id', existingOrder.id);
          
        if (error) {
          console.error('Error updating order:', error);
          throw error;
        }
        
        updatedOrder = {
          ...order,
          id: existingOrder.id,
          manifestNumber: order.manifestNumber,
          profile_id: order.profile_id || profileId
        };
        
        setOrders(prev => prev.map(o => 
          o.id === existingOrder.id ? updatedOrder! : o
        ));
      } else {
        // Ensure products is properly formatted as a valid JSON object
        const productsArray = Array.isArray(order.products) ? order.products : [];
        
        // Create an object for the insert, conditionally including profile_id
        const insertData: any = {
          destination: order.destination,
          time: order.time,
          manifest_number: order.manifestNumber || null,
          products: JSON.parse(JSON.stringify(productsArray)) // Ensure clean JSON
        };
        
        // Only include profile_id if it's defined
        if (profileId) {
          insertData.profile_id = profileId;
        }
        
        // Create new order
        const { data, error } = await supabase
          .from('orders')
          .insert(insertData)
          .select('*')
          .single();

        if (error) {
          console.error('Error creating order:', error);
          throw error;
        }

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
      console.error('Error saving order:', err);
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
    await fetchOrders(profileId);
  };

  // Save all orders
  const handleSaveOrders = async (ordersToSave: Order[]) => {
    try {
      setIsSubmitting(true);
      
      // Process each order one by one
      for (const order of ordersToSave) {
        if (order.id) {
          // Ensure products is properly formatted as a valid JSON object
          const productsArray = Array.isArray(order.products) ? order.products : [];
          
          // Create an object for the update
          const updateData: any = {
            destination: order.destination,
            time: order.time,
            manifest_number: order.manifestNumber || null,
            products: JSON.parse(JSON.stringify(productsArray)) // Ensure clean JSON
          };
          
          // Only include profile_id if it's defined
          if (order.profile_id || profileId) {
            updateData.profile_id = order.profile_id || profileId;
          }
          
          // Update existing order
          const { error } = await supabase
            .from('orders')
            .update(updateData)
            .eq('id', order.id);
            
          if (error) {
            console.error(`Error updating order:`, error);
            throw error;
          }
        } else {
          // Ensure products is properly formatted as a valid JSON object
          const productsArray = Array.isArray(order.products) ? order.products : [];
          
          // Create an object for the insert, conditionally including profile_id
          const insertData: any = {
            destination: order.destination,
            time: order.time,
            manifest_number: order.manifestNumber || null,
            products: JSON.parse(JSON.stringify(productsArray)) // Ensure clean JSON
          };
          
          // Only include profile_id if it's defined
          if (profileId) {
            insertData.profile_id = profileId;
          }
          
          // Create new order
          const { error } = await supabase
            .from('orders')
            .insert(insertData);

          if (error) {
            console.error(`Error creating order:`, error);
            throw error;
          }
        }
      }
      
      // After saving all orders, refresh the list
      await fetchOrders();
      
    } catch (err) {
      console.error('Error saving orders:', err);
      const message = err instanceof Error ? err.message : 'Failed to save orders';
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update orders when profile changes
  const updateOrdersProfile = async (newProfileId: string) => {
    try {
      if (!profileId || !orders.length) return;
      
      setIsSubmitting(true);
      
      // Get valid order IDs (filter out undefined or null)
      const orderIds = orders
        .map(order => order.id)
        .filter((id): id is string => !!id); // Type guard to ensure only string IDs
      
      if (orderIds.length === 0) return;
      
      const { error } = await supabase
        .from('orders')
        .update({ profile_id: newProfileId })
        .in('id', orderIds);
        
      if (error) {
        console.error('Error updating profile for orders:', error);
        throw error;
      }
      
      // Update local state
      setOrders(prev => prev.map(order => ({
        ...order,
        profile_id: newProfileId
      })));
      
    } catch (err) {
      console.error('Error updating orders profile:', err);
      setError('Failed to update orders profile');
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
    handleSaveOrders,
    updateOrdersProfile
  };
}