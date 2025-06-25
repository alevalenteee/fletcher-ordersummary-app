import React from 'react';
import { Product, OrderProduct, Order } from '@/types';
import { getProductDetails, formatRValue, convertToOutput, getOutputUnit } from '../utils';
import { ProductDetailsForm } from './product/ProductDetailsForm';
import { LoadingModal } from './ui/LoadingModal';

interface OrderFormProps {
  productData: Product[];
  onSubmit: (order: Order) => void;
  initialOrder: Order | null;
}

const DESTINATIONS = [
  'ARNDELL', 'BANYO', 'SALISBURY', 'DERRIMUT', 'MOONAH',
  'JANDAKOT', 'GEPPS CROSS', 'BARON', 'SHEPPARTON', 'EE-FIT', 'CANBERRA'
];

const TIMES = Array.from({ length: 24 }, (_, i) => 
  `${String(i).padStart(2, '0')}:00`
);

export const OrderForm: React.FC<OrderFormProps> = ({ 
  productData, 
  onSubmit,
  initialOrder 
}) => {
  const [destination, setDestination] = React.useState('');
  const [customDestination, setCustomDestination] = React.useState('');
  const [time, setTime] = React.useState('');
  const [customTime, setCustomTime] = React.useState('');
  const [productCode, setProductCode] = React.useState('');
  const [packs, setPacks] = React.useState('');
  const [showDetailsForm, setShowDetailsForm] = React.useState(false);
  const [pendingProduct, setPendingProduct] = React.useState<{
    code: string;
    packs: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [products, setProducts] = React.useState<OrderProduct[]>([]);

  // Load initial order data if editing
  React.useEffect(() => {
    if (initialOrder) {
      const isCustomDest = !DESTINATIONS.includes(initialOrder.destination);
      setDestination(isCustomDest ? 'custom' : initialOrder.destination);
      setCustomDestination(isCustomDest ? initialOrder.destination : '');

      const isCustomTime = !TIMES.includes(initialOrder.time);
      setTime(isCustomTime ? 'custom' : initialOrder.time);
      setCustomTime(isCustomTime ? initialOrder.time : '');

      setProducts(initialOrder.products);
    }
  }, [initialOrder]);

  const handleAddProduct = () => {
    if (!productCode || !packs) return;
    const details = getProductDetails(productCode, productData);
    
    if (!details) {
      setPendingProduct({ code: productCode, packs });
      setShowDetailsForm(true);
      return;
    }
    
    setProducts([...products, { 
      productCode, 
      packsOrdered: packs 
    }]);
    setProductCode('');
    setPacks('');
  };

  const handleSaveDetails = (manualDetails: NonNullable<OrderProduct['manualDetails']>) => {
    if (!pendingProduct) return;
    
    setProducts([...products, {
      productCode: pendingProduct.code,
      packsOrdered: pendingProduct.packs,
      manualDetails
    }]);
    
    setShowDetailsForm(false);
    setPendingProduct(null);
    setProductCode('');
    setPacks('');
  };

  const handleCancelDetails = () => {
    setShowDetailsForm(false);
    setPendingProduct(null);
  };

  const handleRemoveProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const handleEditProduct = (index: number) => {
    const product = products[index];
    setProductCode(product.productCode);
    setPacks(product.packsOrdered);
    handleRemoveProduct(index);
  };

  const handleSubmit = async () => {
    const finalDestination = destination === 'custom' ? customDestination : destination;
    const finalTime = time === 'custom' ? customTime : time;
    
    if (!finalDestination || !finalTime || products.length === 0) return;
    
    try {
      setIsSubmitting(true);
      await onSubmit({
        destination: finalDestination,
        time: finalTime,
        manifestNumber: initialOrder?.manifestNumber,
        transportCompany: initialOrder?.transportCompany,
        products
      });

      // Reset form
      setDestination('');
      setCustomDestination('');
      setTime('');
      setCustomTime('');
      setProducts([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm relative">
      <LoadingModal isOpen={isSubmitting} message="Updating Orders..." />
      
      <h2 className="text-xl font-semibold mb-4">
        {initialOrder ? 'Edit Order' : 'Add Order'}
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Destination
          </label>
          <select
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              if (e.target.value !== 'custom') {
                setCustomDestination('');
              }
            }}
            className="w-full p-2 border rounded-md"
          >
            <option value="">Select destination...</option>
            {DESTINATIONS.map(dest => (
              <option key={dest} value={dest}>{dest}</option>
            ))}
            <option value="custom">Other...</option>
          </select>
          {destination === 'custom' && (
            <input
              type="text"
              value={customDestination}
              onChange={(e) => setCustomDestination(e.target.value)}
              placeholder="Enter destination"
              className="w-full p-2 border rounded-md mt-2"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Time
          </label>
          <select
            value={time}
            onChange={(e) => {
              setTime(e.target.value);
              if (e.target.value !== 'custom') {
                setCustomTime('');
              }
            }}
            className="w-full p-2 border rounded-md"
          >
            <option value="">Select time...</option>
            {TIMES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
            <option value="custom">Other...</option>
          </select>
          {time === 'custom' && (
            <input
              type="text"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              placeholder="Enter time (HH:mm)"
              className="w-full p-2 border rounded-md mt-2"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product Code
          </label>
          <input
            type="text"
            value={productCode}
            onChange={(e) => setProductCode(e.target.value)}
            placeholder="Enter product code"
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Packs
          </label>
          <input
            type="number"
            value={packs}
            onChange={(e) => setPacks(e.target.value)}
            placeholder="Enter number of packs"
            className="w-full p-2 border rounded-md"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
        <button
          onClick={handleAddProduct}
          disabled={!productCode || !packs}
          className="px-4 py-3 sm:py-2 bg-black text-white rounded-md disabled:bg-gray-300 text-lg sm:text-base w-full sm:w-auto"
        >
          Add Product
        </button>
        <button
          onClick={handleSubmit}
          disabled={
            !products.length || 
            (!destination && !customDestination) || 
            (!time && !customTime) ||
            (productCode.trim() !== '' || packs.trim() !== '')
          }
          className="px-4 py-3 sm:py-2 bg-black text-white rounded-md disabled:bg-gray-300 text-lg sm:text-base w-full sm:w-auto"
        >
          {initialOrder ? 'Update Order' : 'Submit Order'}
        </button>
      </div>

      {products.length > 0 && (
        <div className="space-y-2">
          {products.map((product, index) => {
            const details = getProductDetails(product.productCode, productData);
            const output = convertToOutput(product.productCode, product.packsOrdered, productData);
            
            return (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                <span>
                  {details ? (
                    <>
                      {details.category} {formatRValue(details.rValue)}
                      {details.width && (
                        <span className="text-gray-500 ml-1">({details.width})</span>
                      )}
                      {' - '}
                      {details.newCode} (<strong>{details.oldCode}</strong>)
                      )
                      {' - '}
                      {product.packsOrdered} Packs = <strong>{output} {getOutputUnit(product.productCode, productData)}</strong>
                    </>
                  ) : (
                    <span className="text-red-600">
                      ⚠️ Unknown Product: {product.productCode}
                    </span>
                  )}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditProduct(index)}
                    className="px-2 py-1 text-sm border rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleRemoveProduct(index)}
                    className="px-2 py-1 text-sm bg-red-600 text-white rounded"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {showDetailsForm && pendingProduct && (
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">
            Add Details for Unknown Product: {pendingProduct.code}
          </h3>
          <ProductDetailsForm
            onSave={handleSaveDetails}
            onCancel={handleCancelDetails}
          />
        </div>
      )}
    </div>
  );
};