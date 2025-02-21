import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Order, OrderProduct, Product } from '@/types';
import { getProductDetails, convertToOutput, getOutputUnit } from '@/utils';
import { ChevronLeft, Plus, Minus, Check, Truck, Save, X } from 'lucide-react';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { QuantityNotification } from '@/components/ui/QuantityNotification';
import { supabase } from '@/lib/supabase';

interface LoadingProgress {
  [key: string]: number | boolean;
}

export const LiveLoadingPage: React.FC<{ productData: Product[] }> = ({ productData }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [selectedProduct, setSelectedProduct] = React.useState<OrderProduct | null>(null);
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
  const lastStateRef = React.useRef<{
    orderId?: string;
    productCode?: string;
  }>({});
  const MAX_RETRIES = 3;

  // Save current state
  React.useEffect(() => {
    try {
      const state = {
        orderId: selectedOrder?.id,
        productCode: selectedProduct?.productCode
      };
      localStorage.setItem('liveLoadingState', JSON.stringify(state));
      lastStateRef.current = state;
    } catch (error) {
      console.error('Error saving live loading state:', error);
    }
  }, [selectedOrder, selectedProduct]);

  // Restore state on mount
  React.useEffect(() => {
    try {
      const savedState = localStorage.getItem('liveLoadingState');
      if (savedState) {
        const { orderId, productCode } = JSON.parse(savedState);
        
        // Restore order selection
        if (orderId) {
          const order = orders.find(o => o.id === orderId);
          if (order) {
            setSelectedOrder(order);
            
            // Restore product selection
            if (productCode) {
              const product = order.products.find(p => p.productCode === productCode);
              if (product) {
                setSelectedProduct(product);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error restoring live loading state:', error);
    }
  }, [orders]);

  // Clear state when navigating away
  React.useEffect(() => {
    return () => {
      if (lastStateRef.current.orderId) {
        localStorage.removeItem('liveLoadingState');
      }
    };
  }, []);

  // Fetch orders on mount
  React.useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(data || []);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Failed to fetch orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Initialize or load existing session
  React.useEffect(() => {
    if (selectedOrder) {
      const initSession = async () => {
        try {
          const { data: existingSessions, error: fetchError } = await supabase
            .from('load_sessions')
            .select('*')
            .eq('destination', selectedOrder.destination)
            .eq('time', selectedOrder.time);

          if (fetchError) throw fetchError;

          if (existingSessions && existingSessions.length > 0) {
            const session = existingSessions[0];
            setLoadingProgress(session.progress);
            setSessionId(session.id);
          } else {
            const { data: newSession, error: insertError } = await supabase
              .from('load_sessions')
              .insert({
                destination: selectedOrder.destination,
                time: selectedOrder.time,
                progress: {}
              })
              .select()
              .single();

            if (insertError) throw insertError;
            if (newSession) {
              setSessionId(newSession.id);
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
          const { error: updateError } = await supabase
            .from('load_sessions')
            .update({ progress: loadingProgress })
            .eq('id', sessionId);

          if (updateError) {
            throw updateError;
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

  // Handle selected order from navigation
  React.useEffect(() => {
    const state = location.state as { selectedOrder?: Order };
    if (state?.selectedOrder) {
      setSelectedOrder(state.selectedOrder);
      // Clean up the state so refreshing doesn't reselect
      navigate(location.pathname, { replace: true });
    }
  }, [location.state]);

  const getConvertedQuantity = (product: OrderProduct): { current: number, target: number } => {
    const packsOrdered = parseInt(product.packsOrdered);
    const details = getProductDetails(product.productCode, productData);
    const manualDetails = product.manualDetails;
    
    // Handle target output
    let targetOutput: number;
    if (details) {
      const converted = convertToOutput(product.productCode, product.packsOrdered, productData);
      targetOutput = typeof converted === 'number' ? converted : 0;
    } else if (manualDetails?.packsPerBale) {
      targetOutput = packsOrdered / manualDetails.packsPerBale;
    } else {
      targetOutput = packsOrdered;
    }

    const currentPacks = loadingProgress[product.productCode] || 0;
    
    // Handle current output
    let currentOutput: number;
    if (details) {
      const converted = convertToOutput(product.productCode, String(currentPacks), productData);
      currentOutput = typeof converted === 'number' ? converted : 0;
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

    setLoadingProgress(prev => {
      const currentPacks = prev[selectedProduct.productCode] || 0;
      const newPacks = Math.max(0, (currentPacks as number) + packIncrement);
      
      // Auto mark as complete when reaching or exceeding target
      if (newPacks >= targetPacks && !prev[`${selectedProduct.productCode}_complete`]) {
        return {
          ...prev,
          [selectedProduct.productCode]: newPacks,
          [`${selectedProduct.productCode}_complete`]: true
        };
      }
      
      return {
        ...prev,
        [selectedProduct.productCode]: newPacks
      };
    });
  };

  const handleRemoveAll = () => {
    if (!selectedProduct) return;
    setLoadingProgress(prev => ({
      ...prev,
      [selectedProduct.productCode]: 0,
      [`${selectedProduct.productCode}_complete`]: false
    }));
  };

  const toggleComplete = () => {
    if (!selectedProduct) return;
    
    const isCurrentlyComplete = loadingProgress[`${selectedProduct.productCode}_complete`];
    
    setLoadingProgress(prev => ({
      ...prev,
      [`${selectedProduct.productCode}_complete`]: !isCurrentlyComplete
    }));
  };

  const getProgressStatus = (product: OrderProduct) => {
    const { current } = getConvertedQuantity(product);
    const isMarkedComplete = loadingProgress[`${product.productCode}_complete`];
    
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
            {selectedOrder.products.map((product, index) => {
              const details = getProductDetails(product.productCode, productData);
              const status = getProgressStatus(product);
              const { current, target } = getConvertedQuantity(product);
              const unit = getOutputUnit(product.productCode, productData);
              
              return (
                <button
                  key={index}
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
                        product.manualDetails?.type === 'Pallet' ? 'Pallets' :
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
                      {loadingProgress[product.productCode] || 0} packs loaded
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
                const currentPacks = loadingProgress[selectedProduct.productCode] || 0;

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
                            manualDetails?.type === 'Pallet' ? 'Pallets' :
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
                  loadingProgress[`${selectedProduct.productCode}_complete`]
                    ? 'bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700'
                    : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
                } text-white`}
              >
                {loadingProgress[`${selectedProduct.productCode}_complete`] ? (
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
                        selectedProduct.manualDetails?.type === 'Pallet' ? 'Pallet' :
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
                      selectedProduct.manualDetails?.type === 'Pallet' ? 'Pallets' :
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