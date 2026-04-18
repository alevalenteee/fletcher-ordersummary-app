import React from 'react';
import { OrderProduct } from '@/types';
import { Button } from '../ui/Button';

interface ProductDetailsFormProps {
  onSave: (details: NonNullable<OrderProduct['manualDetails']>) => void;
  onCancel: () => void;
}

const PRODUCT_TYPES = [
  'Batt',
  'Roll',
  'Board',
  'Pallet'
];

const inputClasses = 'w-full h-10 px-3 border border-neutral-200 rounded-lg bg-white text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10';
const labelClasses = 'block text-xs font-medium text-neutral-600 mb-1.5';

export const ProductDetailsForm: React.FC<ProductDetailsFormProps> = ({
  onSave,
  onCancel
}) => {
  const [type, setType] = React.useState<'Batt' | 'Roll' | 'Board' | 'Pallet'>('Batt');
  const [description, setDescription] = React.useState('');
  const [packsPerBale, setPacksPerBale] = React.useState<number | ''>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      type,
      category: type,
      description,
      packsPerBale: packsPerBale || undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 bg-neutral-50 border border-neutral-200/70 p-4 rounded-lg">
      <div>
        <label className={labelClasses}>
          Product type
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          required
          className={inputClasses}
        >
          <option value="">Select type…</option>
          {PRODUCT_TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClasses}>
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className={inputClasses}
          placeholder="Enter product description"
        />
      </div>

      <div>
        <label className={labelClasses}>
          Packs per bale
        </label>
        <input
          type="number"
          value={packsPerBale}
          onChange={(e) => setPacksPerBale(e.target.value ? Number(e.target.value) : '')}
          min="1"
          className={inputClasses}
          placeholder="Optional — leave empty for single units"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
        >
          Save details
        </Button>
      </div>
    </form>
  );
};
