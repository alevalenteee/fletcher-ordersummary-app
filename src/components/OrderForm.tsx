import React from 'react';
import { Settings2, ClipboardList, Plus, Check } from 'lucide-react';
import { Destination, Product, OrderProduct, Order } from '@/types';
import { getProductDetails, formatRValue, convertToOutput, getOutputUnit } from '../utils';
import { ProductDetailsForm } from './product/ProductDetailsForm';
import { LoadingModal } from './ui/LoadingModal';
import { DestinationsModal } from './DestinationsModal';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';

interface OrderFormProps {
  productData: Product[];
  onSubmit: (order: Order) => void;
  initialOrder: Order | null;
  destinations: Destination[];
  onCreateDestination: (name: string) => Promise<Destination>;
  onDeleteDestination: (id: string) => Promise<void>;
}

const TIMES = Array.from({ length: 24 }, (_, i) => 
  `${String(i).padStart(2, '0')}:00`
);

export const OrderForm: React.FC<OrderFormProps> = ({ 
  productData, 
  onSubmit,
  initialOrder,
  destinations,
  onCreateDestination,
  onDeleteDestination
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
  const [showDestinationsModal, setShowDestinationsModal] = React.useState(false);

  // Load initial order data if editing. When the destination on the order is no
  // longer in the list (e.g. removed by the user), it falls back to the custom
  // input so the original string is preserved on edit.
  React.useEffect(() => {
    if (initialOrder) {
      const destinationNames = destinations.map(d => d.name);
      const isCustomDest = !destinationNames.includes(initialOrder.destination);
      setDestination(isCustomDest ? 'custom' : initialOrder.destination);
      setCustomDestination(isCustomDest ? initialOrder.destination : '');

      const isCustomTime = !TIMES.includes(initialOrder.time);
      setTime(isCustomTime ? 'custom' : initialOrder.time);
      setCustomTime(isCustomTime ? initialOrder.time : '');

      setProducts(initialOrder.products);
    }
  }, [initialOrder, destinations]);

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

  const inputClasses = 'w-full h-10 px-3 border border-neutral-200 rounded-lg bg-white text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 disabled:bg-neutral-50 disabled:text-neutral-400';
  const labelClasses = 'block text-xs font-medium text-neutral-600 mb-1.5';

  return (
    <div className="bg-white p-6 sm:p-7 rounded-card border border-neutral-200/70 shadow-card relative">
      <LoadingModal isOpen={isSubmitting} message="Updating Orders..." />

      <div className="flex items-center gap-2.5 mb-5">
        <div className="p-1.5 rounded-md bg-neutral-100 text-neutral-600">
          <ClipboardList className="w-4 h-4" />
        </div>
        <h2 className="text-base font-semibold tracking-tight text-neutral-900">
          {initialOrder ? 'Edit order' : 'Add order'}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={cn(labelClasses, 'mb-0')}>
              Destination
            </label>
            <button
              type="button"
              onClick={() => setShowDestinationsModal(true)}
              className="flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors rounded -mx-1 px-1"
              title="Manage destinations"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Manage Destinations
            </button>
          </div>
          <select
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              if (e.target.value !== 'custom') {
                setCustomDestination('');
              }
            }}
            className={inputClasses}
          >
            <option value="">Select destination…</option>
            {destinations.map(dest => (
              <option key={dest.id} value={dest.name}>{dest.name}</option>
            ))}
            <option value="custom">Other…</option>
          </select>
          {destination === 'custom' && (
            <input
              type="text"
              value={customDestination}
              onChange={(e) => setCustomDestination(e.target.value)}
              placeholder="Enter destination"
              className={cn(inputClasses, 'mt-2')}
            />
          )}
        </div>

        <div>
          <label className={labelClasses}>
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
            className={inputClasses}
          >
            <option value="">Select time…</option>
            {TIMES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
            <option value="custom">Other…</option>
          </select>
          {time === 'custom' && (
            <input
              type="text"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              placeholder="Enter time (HH:mm)"
              className={cn(inputClasses, 'mt-2')}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className={labelClasses}>
            Product code
          </label>
          <input
            type="text"
            value={productCode}
            onChange={(e) => setProductCode(e.target.value)}
            placeholder="Enter product code"
            className={inputClasses}
          />
        </div>

        <div>
          <label className={labelClasses}>
            Packs
          </label>
          <input
            type="number"
            value={packs}
            onChange={(e) => setPacks(e.target.value)}
            placeholder="Enter number of packs"
            className={inputClasses}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-end gap-2 mb-6 pt-4 border-t border-neutral-100 -mx-6 sm:-mx-7 px-6 sm:px-7">
        <Button
          onClick={handleAddProduct}
          disabled={!productCode || !packs}
          variant="outline"
          className="flex items-center gap-1.5 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Add product
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            !products.length ||
            (!destination && !customDestination) ||
            (!time && !customTime) ||
            (productCode.trim() !== '' || packs.trim() !== '')
          }
          className="flex items-center gap-1.5 w-full sm:w-auto"
        >
          <Check className="w-4 h-4" />
          {initialOrder ? 'Update order' : 'Submit order'}
        </Button>
      </div>

      {products.length > 0 && (
        <div className="space-y-1.5">
          {products.map((product, index) => {
            const details = getProductDetails(product.productCode, productData);
            const output = convertToOutput(product.productCode, product.packsOrdered, productData);

            return (
              <div
                key={index}
                className="flex justify-between items-center gap-3 px-3.5 py-2.5 bg-neutral-50 border border-neutral-200/70 rounded-lg"
              >
                <span className="text-sm text-neutral-700 min-w-0 truncate">
                  {details ? (
                    <>
                      {details.category} {formatRValue(details.rValue)}
                      {details.width && (
                        <span className="text-neutral-500 ml-1">({details.width})</span>
                      )}
                      {' — '}
                      {details.newCode} (<strong className="text-neutral-900">{details.oldCode}</strong>)
                      {' — '}
                      {product.packsOrdered} Packs = <strong className="text-neutral-900">{output} {getOutputUnit(product.productCode, productData)}</strong>
                    </>
                  ) : (
                    <span className="text-red-600">
                      ⚠️ Unknown product: {product.productCode}
                    </span>
                  )}
                </span>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditProduct(index)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleRemoveProduct(index)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showDetailsForm && pendingProduct && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-neutral-900 mb-2">
            Add details for unknown product: <span className="font-semibold text-neutral-900 tabular-nums">{pendingProduct.code}</span>
          </h3>
          <ProductDetailsForm
            onSave={handleSaveDetails}
            onCancel={handleCancelDetails}
          />
        </div>
      )}

      <DestinationsModal
        isOpen={showDestinationsModal}
        onClose={() => setShowDestinationsModal(false)}
        destinations={destinations}
        onCreateDestination={onCreateDestination}
        onDeleteDestination={onDeleteDestination}
      />
    </div>
  );
};