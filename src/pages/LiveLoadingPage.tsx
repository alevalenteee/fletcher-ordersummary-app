import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Order, OrderProduct, Product } from '@/types';
import { getProductDetails, convertToOutput, getOutputUnit } from '@/utils';
import { ChevronLeft, Plus, Minus, Check, Truck, Save, X } from 'lucide-react';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { QuantityNotification } from '@/components/ui/QuantityNotification';
import { supabase } from '@/lib/supabase';
import { useProfiles } from '@/hooks/useProfiles';

interface LoadingProgress {
  [key: string]: number | boolean;
}

// Extend OrderProduct type to include uniqueId
interface ExtendedOrderProduct extends OrderProduct {
  uniqueId: string;
}

// Extend Order type to include products with uniqueId
interface ExtendedOrder extends Omit<Order, 'products'> {
  products: ExtendedOrderProduct[];
}

export const LiveLoadingPage: React.FC<{ productData: Product[] }> = ({ productData }) => {
  const navigate = useNavigate();
  const { currentProfile } = useProfiles();
  const [orders, setOrders] = React.useState<ExtendedOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = React.useState<ExtendedOrder | null>(null);
  const [selectedProduct, setSelectedProduct] = React.useState<ExtendedOrderProduct | null>(null);
  const [loadingProgress, setLoadingProgress] = React.useState<LoadingProgress>({});
  const [sessionId, setSessionId] = React.useState<string>('');
  const [lastSaved, setLastSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [showRemoveConfirmation, setShowRemoveConfirmation] = React.useState(false);
  const saveTimeoutRef = React.useRef<NodeJS.Timeout>();
  const [notification, setNotification] = React.useState<{ 
    show: boolean; 
    amount: number | null;
    type: 'increment' | 'decrement';
  }>({
    show: false,
    amount: null,
    type: 'increment'
  });
  const MAX_RETRIES = 3;

  // Generate unique IDs for products when orders are loaded
  React.useEffect(() => {
    const fetchOrders = async () => {
      try {
        // Start building the query
        let query = supabase
          .from('orders')
          .select('*');
        
        // If a profile ID is provided, filter orders by that profile
        if (currentProfile?.id) {
          query = query.eq('profile_id', currentProfile.id);
        }
        
        // Execute the query with sorting
        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        
        // Transform the data to match our Order interface and add uniqueIds to products
        const transformedOrders = (data || []).map(order => {
          const products = (order.products || []).map((product: OrderProduct, index: number) => ({
            ...product,
            uniqueId: `${order.id}_${product.productCode}_${index}`
          }));
          
          return {
            ...order,
            manifestNumber: order.manifest_number,
            products
          };
        });
        
        setOrders(transformedOrders);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Failed to fetch orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentProfile]);

  // Clean up stale load sessions
  React.useEffect(() => {
    const cleanupStaleSessions = async () => {
      try {
        // Get the saved session ID before cleanup
        const savedState = localStorage.getItem('liveLoadingState');
        let savedSessionId = '';
        if (savedState) {
          const { sessionId } = JSON.parse(savedState);
          savedSessionId = sessionId || '';
        }
        
        // Get all load sessions
        const { data: sessions, error: fetchError } = await supabase
          .from('load_sessions')
          .select('*');
          
        if (fetchError) throw fetchError;
        
        if (sessions && sessions.length > 0) {
          // Define a type for our session objects
          interface SessionData {
            id: string;
            destination: string;
            time: string;
            user_id?: string;
            progress: Record<string, any>;
            created_at: string;
          }
          
          // Get all valid order destination and time combinations
          const validOrderKeys = orders.map(order => `${order.destination}_${order.time}`);
          
          // Identify duplicate sessions (same destination+time+user_id)
          const sessionsByKey: Record<string, SessionData[]> = {};
          
          sessions.forEach(session => {
            const key = `${session.destination}_${session.time}_${session.user_id || 'none'}`;
            if (!sessionsByKey[key]) {
              sessionsByKey[key] = [];
            }
            sessionsByKey[key].push(session as SessionData);
          });
          
          // Sessions to delete: stale ones + duplicates (keeping only the most recent with progress)
          const toDelete: string[] = [];
          
          // First find stale sessions
          const staleSessions = sessions.filter(session => 
            // Check for no matching destination+time
            !validOrderKeys.includes(`${session.destination}_${session.time}`)
          );
          
          staleSessions.forEach(session => {
            // NEVER delete the saved session ID
            if (session.id !== savedSessionId) {
              toDelete.push(session.id);
            }
          });
          
          // Then find duplicates
          Object.values(sessionsByKey).forEach(groupedSessions => {
            if (groupedSessions.length > 1) {
              // Sort sessions by:
              // 1. If it's the saved session ID
              // 2. Sessions with progress first
              // 3. Most recent created_at
              const sortedSessions = [...groupedSessions].sort((a, b) => {
                // Always prioritize the saved session ID
                if (a.id === savedSessionId) return -1;
                if (b.id === savedSessionId) return 1;
                
                const aProgress = Object.keys(a.progress || {}).length;
                const bProgress = Object.keys(b.progress || {}).length;
                
                // Then sort by progress (sessions with progress come first)
                if (aProgress > 0 && bProgress === 0) return -1;
                if (aProgress === 0 && bProgress > 0) return 1;
                
                // If both have progress or neither has progress, sort by created_at
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              });
              
              // Keep the first one (with most progress or most recent), delete the rest
              const sessionToKeep = sortedSessions[0];
              const sessionsToDelete = sortedSessions.slice(1);
              
              sessionsToDelete.forEach(session => {
                // NEVER delete the saved session ID
                if (session.id !== savedSessionId) {
                  toDelete.push(session.id);
                }
              });
            }
          });
          
          // Delete all identified sessions
          if (toDelete.length > 0) {
            for (const sessionId of toDelete) {
              await supabase
                .from('load_sessions')
                .delete()
                .eq('id', sessionId);
            }
          }
        }
      } catch (err) {
        console.error('Error cleaning up sessions:', err);
      }
    };
    
    // Run cleanup immediately on mount
    cleanupStaleSessions();
    
    // And again whenever orders change
    if (orders.length > 0 && !loading) {
      cleanupStaleSessions();
    }
  }, [orders, loading]);

  // Restore state on mount
  React.useEffect(() => {
    const restoreState = async () => {
      try {
        const savedState = localStorage.getItem('liveLoadingState');
        if (!savedState) return;
        
        const { orderId, uniqueId, sessionId: savedSessionId } = JSON.parse(savedState);
        
        // If we have a saved sessionId, use it to directly look up the session
        if (savedSessionId) {
          const { data, error } = await supabase
            .from('load_sessions')
            .select('*')
            .eq('id', savedSessionId)
            .maybeSingle();
            
          if (data && !error) {
            // Set the session ID so it will be used when the order is selected
            setSessionId(savedSessionId);
            setLoadingProgress(data.progress || {});
            
            // Verify the order exists in memory or database
            if (orderId) {
              // First check in memory orders 
              const orderInMemory = orders.find(o => o.id === orderId);
              
              if (orderInMemory) {
                // Set the order only after we've verified the session
                setSelectedOrder(orderInMemory);
                
                // Restore product selection
                if (uniqueId) {
                  const product = orderInMemory.products.find(p => p.uniqueId === uniqueId);
                  if (product) {
                    setSelectedProduct(product);
                  }
                }
              }
            }
            
            // Return early, we've restored the state
            return;
          }
        }
        
        // If session ID lookup failed or wasn't available, try order-based restoration
        // Verify the order exists in the database
        if (orderId) {
          // First check in memory orders 
          const orderInMemory = orders.find(o => o.id === orderId);
          
          if (!orderInMemory && orders.length > 0) {
            // If not found in memory but orders are loaded, verify against database
            const { data, error } = await supabase
              .from('orders')
              .select('*')
              .eq('id', orderId)
              .maybeSingle();
              
            if (error || !data) {
              localStorage.removeItem('liveLoadingState');
              return;
            }
          }
          
          // Now proceed with restoration if order exists
          if (orderInMemory) {
            // Before setting the order, try to find any existing sessions for this order
            if (!savedSessionId) {
              const { data: existingSessions, error } = await supabase
                .from('load_sessions')
                .select('*')
                .eq('destination', orderInMemory.destination)
                .eq('time', orderInMemory.time);
                
              if (!error && existingSessions && existingSessions.length > 0) {
                // Find a session with progress
                const sessionWithProgress = existingSessions.find(
                  session => session.progress && Object.keys(session.progress).length > 0
                );
                
                if (sessionWithProgress) {
                  setSessionId(sessionWithProgress.id);
                  setLoadingProgress(sessionWithProgress.progress || {});
                  
                  // Save this session ID to localStorage
                  try {
                    const newState = {
                      orderId: orderInMemory.id,
                      uniqueId: uniqueId,
                      sessionId: sessionWithProgress.id
                    };
                    localStorage.setItem('liveLoadingState', JSON.stringify(newState));
                  } catch (e) {
                    console.error('Error updating localStorage:', e);
                  }
                }
              }
            }
            
            setSelectedOrder(orderInMemory);
            
            // Restore product selection
            if (uniqueId) {
              const product = orderInMemory.products.find(p => p.uniqueId === uniqueId);
              if (product) {
                setSelectedProduct(product);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error restoring live loading state:', error);
        // Clear potentially corrupted state
        localStorage.removeItem('liveLoadingState');
      }
    };
    
    restoreState();
  }, [orders]);

  // Initialize or load existing session
  React.useEffect(() => {
    if (selectedOrder) {
      // Helper function to clean up duplicate sessions
      const cleanupDuplicateSessions = async (sessions: any[], keepSessionId: string) => {
        try {
          for (const session of sessions) {
            if (session.id !== keepSessionId) {
              await supabase
                .from('load_sessions')
                .delete()
                .eq('id', session.id);
            }
          }
        } catch (err) {
          console.error('Error cleaning up duplicate sessions:', err);
        }
      };
      
      const initSession = async () => {
        try {
          // Protect against concurrent execution
          let isSessionInitialized = false;
          
          // If we already have a sessionId from localStorage, use it directly
          if (sessionId) {
            // Verify it still exists
            const { data, error } = await supabase
              .from('load_sessions')
              .select('*')
              .eq('id', sessionId)
              .maybeSingle();
              
            if (data && !error) {
              // Make sure we set the loading progress from the retrieved data
              setLoadingProgress(data.progress || {});
              isSessionInitialized = true; // Mark as initialized
            } else {
              // Clear sessionId since it's invalid
              setSessionId('');
            }
          }
          
          // Only proceed if we haven't initialized the session already
          if (!isSessionInitialized) {
            // If we don't have a valid sessionId, look for existing sessions
            
            // Add user id filter if available
            let query = supabase
              .from('load_sessions')
              .select('*')
              .eq('destination', selectedOrder.destination)
              .eq('time', selectedOrder.time);
              
            // Filter by current profile if available
            if (currentProfile?.id) {
              query = query.eq('user_id', currentProfile.id);
            }
            
            // Order by created_at descending to get the most recent sessions first
            query = query.order('created_at', { ascending: false });
            
            const { data: existingSessions, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            if (existingSessions && existingSessions.length > 0) {
              // First try to find the most recent session with progress
              const sessionWithProgress = existingSessions.find(
                session => session.progress && Object.keys(session.progress).length > 0
              );
              
              // Use the session with progress, or fall back to the most recent session
              const session = sessionWithProgress || existingSessions[0];
              
              setLoadingProgress(session.progress || {});
              setSessionId(session.id);
              
              // Update localStorage with the current session ID
              try {
                const state = {
                  orderId: selectedOrder.id,
                  uniqueId: selectedProduct?.uniqueId,
                  sessionId: session.id
                };
                localStorage.setItem('liveLoadingState', JSON.stringify(state));
              } catch (e) {
                console.error('Error updating localStorage:', e);
              }
              
              // If we found multiple sessions but are only using one, clean up the others
              if (existingSessions.length > 1) {
                cleanupDuplicateSessions(existingSessions, session.id);
              }
            } else {
              const { data: newSession, error: insertError } = await supabase
                .from('load_sessions')
                .insert({
                  destination: selectedOrder.destination,
                  time: selectedOrder.time,
                  progress: {},
                  user_id: currentProfile?.id
                })
                .select()
                .single();

              if (insertError) throw insertError;
              if (newSession) {
                setSessionId(newSession.id);
                setLoadingProgress({});
                
                // Update localStorage with the new session ID
                try {
                  const state = {
                    orderId: selectedOrder.id,
                    uniqueId: selectedProduct?.uniqueId,
                    sessionId: newSession.id
                  };
                  localStorage.setItem('liveLoadingState', JSON.stringify(state));
                } catch (e) {
                  console.error('Error updating localStorage:', e);
                }
              }
            }
          }
        } catch (err) {
          console.error('Failed to initialize session:', err);
          setError('Failed to initialize loading session');
        }
      };
      
      initSession();
    }
  }, [selectedOrder]);
  
  // Save progress to session with debounce
  React.useEffect(() => {
    if (sessionId && Object.keys(loadingProgress).length > 0) {
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      const saveProgress = async () => {
        setSaving(true);
        try {
          // Deep copy of loading progress to ensure we're saving exactly what's in state
          const progressToSave = JSON.parse(JSON.stringify(loadingProgress));
          
          // First verify the session still exists
          const { data: checkSession, error: checkError } = await supabase
            .from('load_sessions')
            .select('id')
            .eq('id', sessionId)
            .maybeSingle();
            
          if (checkError || !checkSession) {
            throw new Error('Session does not exist');
          }
          
          const { data, error: updateError } = await supabase
            .from('load_sessions')
            .update({ 
              progress: progressToSave,
              // Ensure user_id is set to the current user if available
              user_id: currentProfile?.id
            })
            .eq('id', sessionId)
            .select()
            .single();

          if (updateError) {
            throw updateError;
          }
          
          // After successful save, make sure localStorage has the latest information
          if (data) {
            try {
              const state = {
                orderId: selectedOrder?.id,
                uniqueId: selectedProduct?.uniqueId,
                sessionId: data.id
              };
              localStorage.setItem('liveLoadingState', JSON.stringify(state));
            } catch (e) {
              console.error('Error updating localStorage after save:', e);
            }
          }
          
          setRetryCount(0);
          setError(null);
          setLastSaved(true);
        } catch (err) {
          console.error('Failed to save progress:', err);
          
          if (retryCount < MAX_RETRIES) {
            setRetryCount(prev => prev + 1);
            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, retryCount) * 1000;
            saveTimeoutRef.current = setTimeout(saveProgress, delay);
            setError(`Retrying save... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
          } else {
            setError('Failed to save progress after multiple attempts');
            setLastSaved(false);
            
            // On final failure, try to get a fresh session
            // Check if our session still exists
            const checkSession = async () => {
              try {
                const { data, error } = await supabase
                  .from('load_sessions')
                  .select('*')
                  .eq('id', sessionId)
                  .maybeSingle();
                  
                if (error || !data) {
                  setSessionId('');
                  localStorage.removeItem('liveLoadingState');
                }
              } catch (e) {
                console.error('Error checking session validity:', e);
              }
            };
            
            checkSession();
          }
        } finally {
          setSaving(false);
        }
      };

      // Set new timeout for saving with initial 1 second debounce
      saveTimeoutRef.current = setTimeout(saveProgress, 1000);
    }

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [loadingProgress, sessionId, retryCount]);

  const getConvertedQuantity = (product: ExtendedOrderProduct): { current: number, target: number } => {
    const packsOrdered = parseInt(product.packsOrdered);
    const details = getProductDetails(product.productCode, productData);
    const manualDetails = product.manualDetails;
    const uniqueId = product.uniqueId;
    
    // Handle target output
    let targetOutput: number;
    if (details) {
      const converted = convertToOutput(product.productCode, product.packsOrdered, productData);
      targetOutput = typeof converted === 'number' ? converted : 0;
    } else if (manualDetails?.type === 'Unknown') {
      // For AI-analyzed unknown products, use packs as units (1:1 ratio)
      targetOutput = packsOrdered;
    } else if (manualDetails?.packsPerBale) {
      targetOutput = packsOrdered / manualDetails.packsPerBale;
    } else {
      targetOutput = packsOrdered;
    }

    const currentPacks = loadingProgress[uniqueId] || 0;
    
    // Handle current output
    let currentOutput: number;
    if (details) {
      const converted = convertToOutput(product.productCode, String(currentPacks), productData);
      currentOutput = typeof converted === 'number' ? converted : 0;
    } else if (manualDetails?.type === 'Unknown') {
      // For AI-analyzed unknown products, use packs as units (1:1 ratio)
      currentOutput = currentPacks as number;
    } else if (manualDetails?.packsPerBale) {
      currentOutput = (currentPacks as number) / manualDetails.packsPerBale;
    } else {
      currentOutput = currentPacks as number;
    }
    
    return {
      current: currentOutput,
      target: targetOutput
    };
  };

  const showNotification = (amount: number, type: 'increment' | 'decrement') => {
    setNotification({ show: true, amount: Math.abs(amount), type });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, show: false }));
    // Reset amount to null after animation completes
    setTimeout(() => {
      setNotification(prev => ({ ...prev, amount: null }));
    }, 1600);
  };

  const handleQuantityChange = (amount: number) => {
    if (!selectedProduct) return;

    // Show notification with the unit amount
    showNotification(amount, amount > 0 ? 'increment' : 'decrement');

    // Get product details and determine conversion factor
    const details = getProductDetails(selectedProduct.productCode, productData);
    const manualDetails = selectedProduct.manualDetails;
    
    // Calculate how many packs to add based on the unit increment
    let packIncrement: number;
    if (details) {
      // For known products, multiply by packs per bale
      packIncrement = amount * details.packsPerBale;
    } else if (manualDetails?.packsPerBale) {
      // For manual products with bale conversion
      packIncrement = amount * manualDetails.packsPerBale;
    } else {
      // For single units or pallets, increment directly
      packIncrement = amount;
    }

    const targetPacks = parseInt(selectedProduct.packsOrdered);
    const uniqueId = selectedProduct.uniqueId;
    
    setLoadingProgress(prev => {
      const currentPacks = prev[uniqueId] || 0;
      const newPacks = Math.max(0, (currentPacks as number) + packIncrement);
      
      // Auto mark as complete when reaching or exceeding target
      if (newPacks >= targetPacks && !prev[`${uniqueId}_complete`]) {
        const newState = {
          ...prev,
          [uniqueId]: newPacks,
          [`${uniqueId}_complete`]: true
        };
        return newState;
      }
      
      const newState = {
        ...prev,
        [uniqueId]: newPacks
      };
      return newState;
    });
  };

  const handleRemoveAll = () => {
    if (!selectedProduct) return;
    const uniqueId = selectedProduct.uniqueId;
    
    setLoadingProgress(prev => {
      const newState = {
        ...prev,
        [uniqueId]: 0,
        [`${uniqueId}_complete`]: false
      };
      return newState;
    });
  };

  const toggleComplete = () => {
    if (!selectedProduct) return;
    const uniqueId = selectedProduct.uniqueId;
    
    const isCurrentlyComplete = loadingProgress[`${uniqueId}_complete`];
    
    setLoadingProgress(prev => {
      const newState = {
        ...prev,
        [`${uniqueId}_complete`]: !isCurrentlyComplete
      };
      return newState;
    });
  };

  const getProgressStatus = (product: ExtendedOrderProduct) => {
    const { current } = getConvertedQuantity(product);
    const isMarkedComplete = loadingProgress[`${product.uniqueId}_complete`];
    
    if (isMarkedComplete) return 'completed';
    if (current === 0) return 'not-started';    
    return 'in-progress';
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 border-green-500 text-green-700';
      case 'in-progress': return 'bg-yellow-100 border-yellow-500 text-yellow-700';
      default: return 'bg-white border-gray-300 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in-progress': return 'In Progress';
      default: return 'Not Started';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-6">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="w-20">
              {/* Left spacer */}
            </div>
            <div className="flex items-center gap-2 justify-center">
              <Truck className="w-6 h-6" />
              <h1 className="text-xl font-bold">Live Loading</h1>
            </div>
            <div className="w-20 flex justify-end">
              {saving ? (
                <div className="flex items-center text-gray-500 gap-1">
                  <Save className="w-5 h-5 animate-pulse" />
                  <span className="text-sm">Saving...</span>
                </div>
              ) : lastSaved ? (
                <div className="flex items-center text-green-600 gap-1">
                  <Check className="w-5 h-5" />
                  <span className="text-sm">Saved</span>
                </div>
              ) : (
                <div className="w-5 h-5" aria-hidden="true" />
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {error && (
          <div className={`border p-4 rounded-lg ${
            error.includes('Retrying') 
              ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {error}
          </div>
        )}

        {!selectedOrder ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Select Order</h2>
            {orders.map((order, index) => (
              <button
                key={order.id || index}
                onClick={() => setSelectedOrder(order)}
                className="relative z-10 w-full p-6 bg-white rounded-lg shadow-sm border border-gray-200 text-left hover:border-black transition-colors cursor-pointer hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-black focus:ring-opacity-50"
              >
                <div className="flex flex-col">
                  <div className="font-medium text-xl mb-2">{order.destination}</div>
                  <div className="text-lg text-gray-700">{order.time}</div>
                  <div className="text-base text-gray-600 mt-2 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center bg-gray-100 px-2.5 py-0.5 rounded-full font-medium">
                      {order.products.length} products
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : !selectedProduct ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">
              {selectedOrder.destination} - {selectedOrder.time}
            </h2>
            {selectedOrder.products.map((product) => {
              const details = getProductDetails(product.productCode, productData);
              const status = getProgressStatus(product);
              const { current, target } = getConvertedQuantity(product);
              const unit = getOutputUnit(product.productCode, productData);
              
              return (
                <button
                  key={product.uniqueId}
                  onClick={() => setSelectedProduct(product)}
                  className={`w-full p-6 rounded-lg shadow-sm border-2 text-left transition-colors relative ${
                    getProgressColor(status)
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-medium mb-2">
                        {product.productCode}
                        {details && ` (${details.oldCode})`}
                      </div>
                      <div className="text-lg text-gray-700">
                        {details ? (
                          <>
                            {details.category} {details.rValue}
                            {details.width && <span className="ml-1">({details.width})</span>}
                          </>
                        ) : product.manualDetails ? (
                          <>
                            {product.manualDetails.category || product.manualDetails.type}
                            <div className="text-base text-gray-600">
                              {product.manualDetails.description}
                            </div>
                          </>
                        ) : (
                          <span className="text-red-600">Unknown Product</span>
                        )}
                      </div>
                    </div>
                    {status === 'completed' && <Check className="w-8 h-8 text-green-500" />}
                  </div>
                  <div className="flex flex-col mt-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="text-2xl font-bold">
                      {current} / {target} {
                        details ? unit :
                        product.manualDetails?.packsPerBale ? 'Bales' :
                        'Units'
                      }
                      </div>
                      <div className={`text-sm font-medium flex flex-col items-end ${
                        status === 'completed' ? 'text-green-600' :
                        status === 'in-progress' ? 'text-yellow-600' :
                        'text-gray-600'
                      }`}>
                        <span>{status === 'completed' ? 'Marked' : getStatusText(status).split(' ')[0]}</span>
                        <span>{status === 'completed' ? 'Complete' : getStatusText(status).split(' ')[1] || ''}</span>
                      </div>
                    </div>
                    <div className="text-xl text-gray-600">
                      {loadingProgress[product.uniqueId] || 0} packs loaded
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border-2 p-6 space-y-2">
              {(() => {
                const details = getProductDetails(selectedProduct.productCode, productData);
                const { current, target } = getConvertedQuantity(selectedProduct);
                const unit = getOutputUnit(selectedProduct.productCode, productData);
                const manualDetails = selectedProduct.manualDetails;
                const status = getProgressStatus(selectedProduct);
                const uniqueId = selectedProduct.uniqueId;
                const currentPacks = loadingProgress[uniqueId] || 0;

                return (
                  <>
                    <div className="text-2xl font-medium mb-3">
                      {selectedProduct.productCode}
                      {details && ` (${details.oldCode})`}
                    </div>
                    <div className="text-xl text-gray-700">
                      {details ? (
                        <>
                          {details.category} {details.rValue}
                          {details.width && <span className="ml-1">({details.width})</span>}
                        </>
                      ) : manualDetails ? (
                        <>
                          {manualDetails.category || manualDetails.type}
                          <div className="text-lg text-gray-600">
                            {manualDetails.description}
                          </div>
                        </>
                      ) : (
                        <span className="text-red-600">Unknown Product</span>
                      )}
                    </div>
                    <div className="space-y-2 mt-6">
                      <div className="flex justify-between items-center">
                        <div className={`text-3xl font-bold ${
                          status === 'completed' ? 'text-green-600' : ''
                        }`}>
                          {current} / {target} {
                            details ? unit :
                            manualDetails?.packsPerBale ? 'Bales' :
                            'Units'
                          }
                        </div>
                        <div className={`text-lg font-medium ${
                          status === 'completed' ? 'text-green-600' :
                          status === 'in-progress' ? 'text-yellow-600' :
                          'text-gray-600'
                        }`}>
                          {status === 'completed' ? 'Marked Complete' : getStatusText(status)}
                        </div>
                      </div>
                      <div className="text-2xl text-gray-600">
                        {currentPacks} packs loaded
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 gap-4 mb-4">
              <button
                onClick={toggleComplete}
                className={`w-full p-4 rounded-lg text-xl font-medium flex items-center justify-center gap-2 ${
                  loadingProgress[`${selectedProduct.uniqueId}_complete`]
                    ? 'bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700'
                    : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
                } text-white`}
              >
                {loadingProgress[`${selectedProduct.uniqueId}_complete`] ? (
                  <>
                    <X className="w-6 h-6" />
                    Mark as Incomplete
                  </>
                ) : (
                  <>
                    <Check className="w-6 h-6" />
                    Mark as Complete
                  </>
                )}
              </button>
            </div>

            {/* Remove buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(() => {
                const details = getProductDetails(selectedProduct.productCode, productData);
                return (
                  <>
                    <button
                      onClick={() => handleQuantityChange(-1)}
                      className="p-6 bg-red-600 text-white rounded-lg text-xl font-medium hover:bg-red-700 active:bg-red-800 flex items-center justify-center gap-4"
                      title={`Remove 1 ${
                        details ? 'Bale' :
                        selectedProduct.manualDetails?.packsPerBale ? 'Bale' :
                        'Unit'
                      }`}
                    >
                      <Minus className="w-8 h-8 sm:w-6 sm:h-6" />
                      REMOVE - 1
                    </button>
                    <button
                      onClick={() => {
                        setShowRemoveConfirmation(true);
                      }}
                      className="p-6 bg-red-700 text-white rounded-lg text-xl font-medium hover:bg-red-800 active:bg-red-900 flex items-center justify-center gap-4"
                    >
                      <X className="w-8 h-8 sm:w-6 sm:h-6" />
                      REMOVE ALL
                    </button>
                  </>
                );
              })()}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 4, 5, 6, 7].map(num => {
                const details = getProductDetails(selectedProduct.productCode, productData);
                return (
                  <button
                    key={num}
                    onClick={() => handleQuantityChange(num)}
                    className="flex items-center justify-center gap-2 p-6 bg-black text-white rounded-lg text-xl font-medium hover:bg-gray-800 active:bg-gray-900"
                    title={`Add ${num} ${
                      details ? 'Bales' :
                      selectedProduct.manualDetails?.packsPerBale ? 'Bales' :
                      'Units'
                    }`}
                  >
                    <Plus className="w-6 h-6" />
                    {num}
                  </button>
                );
              })}
            </div>
            
          </div>
        )}
        
        <button
          onClick={() => {
            if (selectedProduct) {
              setSelectedProduct(null);
            } else if (selectedOrder) {
              setSelectedOrder(null);
            } else {
              navigate('/');
            }
          }}
          className="w-full bg-black text-white py-4 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
      </main>
      
      <ConfirmationModal
        isOpen={showRemoveConfirmation}
        onClose={() => setShowRemoveConfirmation(false)}
        onConfirm={handleRemoveAll}
        title="Remove All Units"
        message="Are you sure you want to remove all units for this product? This action cannot be undone."
        confirmText="Remove All"
        cancelText="Cancel"
      />
      <QuantityNotification
        show={notification.show}
        amount={notification.amount}
        type={notification.type}
        onExited={hideNotification}
      />
    </div>
  );
};