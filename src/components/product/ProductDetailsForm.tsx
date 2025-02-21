import React from 'react';
import { OrderProduct } from '@/types';

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
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 bg-gray-50 p-4 rounded-lg">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Product Type
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          required
          className="w-full p-2 border rounded-md text-sm"
        >
          <option value="">Select type...</option>
          {PRODUCT_TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="w-full p-2 border rounded-md text-sm"
          placeholder="Enter product description"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Packs per Bale
        </label>
        <input
          type="number"
          value={packsPerBale}
          onChange={(e) => setPacksPerBale(e.target.value ? Number(e.target.value) : '')}
          min="1"
          className="w-full p-2 border rounded-md text-sm"
          placeholder="Optional - leave empty for single units"
        />
      </div>

      <div className="flex justify-end space-x-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-3 py-1.5 text-sm bg-black text-white rounded-md hover:bg-gray-800"
        >
          Save Details
        </button>
      </div>
    </form>
  );
};