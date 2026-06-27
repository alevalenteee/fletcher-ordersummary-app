import React from 'react';
import { SplitLoadTrailer } from '@/types';
import { trailerLabel } from '@/utils/splitLoad';
import { cn } from '@/lib/utils';

interface SplitLoadStopHeaderProps {
  destination: string;
  deliveryAddress?: string;
  trailer: SplitLoadTrailer | null;
  onTrailerChange?: (trailer: SplitLoadTrailer | null) => void;
  isPrint?: boolean;
}

const selectClasses =
  'h-8 px-2 border border-neutral-200 rounded-md bg-white text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10';

export const SplitLoadStopHeader: React.FC<SplitLoadStopHeaderProps> = ({
  destination,
  deliveryAddress,
  trailer,
  onTrailerChange,
  isPrint = false,
}) => {
  if (isPrint) {
    if (!trailer) return null;
    return (
      <p
        className={cn(
          'text-xs font-semibold mb-2',
          trailer === 'A' ? 'text-blue-700' : 'text-emerald-700'
        )}
      >
        {trailerLabel(trailer)}
      </p>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-900">{destination}</p>
        {deliveryAddress && deliveryAddress !== destination && (
          <p className="text-xs text-neutral-500 mt-0.5 break-words">{deliveryAddress}</p>
        )}
      </div>
      {onTrailerChange && (
        <div className="shrink-0 sm:w-36">
          <label className="sr-only">Trailer for {destination}</label>
          <select
            value={trailer ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              onTrailerChange(val === '' ? null : (val as SplitLoadTrailer));
            }}
            className={selectClasses}
          >
            <option value="">Unassigned</option>
            <option value="A">A-Trailer</option>
            <option value="B">B-Trailer</option>
          </select>
        </div>
      )}
    </div>
  );
};
