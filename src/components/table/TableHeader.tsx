import React from 'react';

export const TableHeader: React.FC = () => (
  <thead>
    <tr className="bg-gray-50 print:table-row">
      <th className="hidden sm:table-cell text-left p-3 font-semibold">Product</th>
      <th className="hidden sm:table-cell text-left p-3 font-semibold">Code</th>
      <th className="hidden sm:table-cell text-left p-3 font-semibold">Packs</th>
      <th className="hidden sm:table-cell text-left p-3 font-semibold">Output</th>
      <th className="sm:hidden text-left p-3 font-semibold">Details</th>
    </tr>
  </thead>
);