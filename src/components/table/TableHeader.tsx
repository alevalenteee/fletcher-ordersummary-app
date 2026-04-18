import React from 'react';

export const TableHeader: React.FC = () => (
  <thead>
    <tr className="bg-neutral-50 border-b border-neutral-200/70 print:table-row">
      <th className="hidden sm:table-cell text-left px-3 py-2 text-[11px] font-medium text-neutral-500 uppercase tracking-wide">Product</th>
      <th className="hidden sm:table-cell text-left px-3 py-2 text-[11px] font-medium text-neutral-500 uppercase tracking-wide">Code</th>
      <th className="hidden sm:table-cell text-left px-3 py-2 text-[11px] font-medium text-neutral-500 uppercase tracking-wide">Packs</th>
      <th className="hidden sm:table-cell text-left px-3 py-2 text-[11px] font-medium text-neutral-500 uppercase tracking-wide">Output</th>
      <th className="sm:hidden text-left px-3 py-2 text-[11px] font-medium text-neutral-500 uppercase tracking-wide">Details</th>
    </tr>
  </thead>
);