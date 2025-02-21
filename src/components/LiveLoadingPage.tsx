import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Order, Product } from '@/types';
import { ChevronLeft, Truck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LoadingModal } from '@/components/ui/LoadingModal';
import { supabase } from '@/lib/supabase';
import { getProductDetails } from '@/utils';

interface LiveLoadingPageProps {
  productData: Product[];
}

export const LiveLoadingPage: React.FC<LiveLoadingPageProps> = ({ productData }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

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

  // Handle selected order from navigation
  React.useEffect(() => {
    const state = location.state as { selectedOrder?: Order };
    if (state?.selectedOrder) {
      setSelectedOrder(state.selectedOrder);
      // Clean up the state so refreshing doesn't reselect
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate]);

  if (loading) {
    return <LoadingModal isOpen={true} message="Loading orders..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg max-w-lg w-full mx-4">
          <h2 className="text-lg font-semibold mb-2">Error</h2>
          <p>{error}</p>
          <Button
            onClick={() => navigate('/')}
            className="mt-4 w-full flex items-center justify-center gap-2"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
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
            <div className="w-20" />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        <div className="space-y-4">
          <div className="mb-6">
            {selectedOrder ? (
              <>
                <h2 className="text-xl font-semibold mb-1">
                  {selectedOrder.destination} - {selectedOrder.time}
                </h2>
                {selectedOrder.manifestNumber && (
                  <p className="text-base text-gray-700 font-medium">
                    Manifest Number: {selectedOrder.manifestNumber}
                  </p>
                )}
              </>
            ) : (
              <h2 className="text-xl font-semibold mb-1">Select an Order</h2>
            )}
          </div>
          
          {selectedOrder ? (
            <div className="space-y-4">
              {selectedOrder.products.map((product, index) => {
                const details = getProductDetails(product.productCode, productData);
                return (
                  <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-medium mb-1">{product.productCode}</h3>
                    {details && (
                      <div className="text-gray-600 mb-2">
                        {details.category} {details.rValue}
                        {details.width && <span className="ml-1">({details.width})</span>}
                        {details.oldCode && (
                          <div className="text-sm text-gray-500">
                            Old Code: {details.oldCode}
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-gray-700 font-medium">{product.packsOrdered} packs</p>
                  </div>
                );
              })}
              
              <Button
                onClick={() => setSelectedOrder(null)}
                className="w-full flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                Back to Orders
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order, index) => (
                <Button
                  key={index}
                  onClick={() => setSelectedOrder(order)}
                  variant="outline"
                  className="w-full text-left flex flex-col items-start p-4 hover:border-black transition-colors"
                >
                  <span className="text-lg font-medium">{order.destination}</span>
                  <span className="text-gray-600">{order.time}</span>
                  {order.manifestNumber && (
                    <span className="text-sm text-gray-500">
                      Manifest: {order.manifestNumber}
                    </span>
                  )}
                </Button>
              ))}
              
              <Button
                onClick={() => navigate('/')}
                className="w-full flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                Back to Home
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};