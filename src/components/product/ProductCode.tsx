import React from 'react';
import { Flag } from 'lucide-react';
import { Product, OrderProduct } from '@/types';

interface ProductCodeProps {
  details: Product | undefined;
  code: string;
  manualDetails?: OrderProduct['manualDetails'];
  location?: string;
  mustGo?: boolean;
  onToggleMustGo?: () => void;
  // When true, render the more prominent print-view treatment (bold red
  // "MUST GO" pill badge). The OrdersList card keeps the quieter flag-only
  // treatment so the screen UI doesn't get noisy for frequent toggling.
  isPrint?: boolean;
}

export const ProductCode: React.FC<ProductCodeProps> = ({
  details,
  code,
  manualDetails,
  location,
  mustGo,
  onToggleMustGo,
  isPrint,
}) => {
  const locationSuffix = location ? (
    <span className="italic text-neutral-500 ml-1">{location}</span>
  ) : null;

  // Interactive screen flag — hidden on the print view (the flag now
  // renders to the left of the PRODUCT column instead) and when actually
  // printing the OrdersList directly.
  const flag = onToggleMustGo && !isPrint ? (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggleMustGo();
      }}
      title={mustGo ? 'Clear Must Go' : 'Mark as Must Go'}
      aria-label={mustGo ? 'Clear Must Go' : 'Mark as Must Go'}
      aria-pressed={!!mustGo}
      className={`mr-1.5 inline-flex items-center justify-center align-middle rounded-sm p-0.5 transition-colors print:hidden ${
        mustGo
          ? 'text-red-500'
          : 'text-neutral-300 opacity-0 group-hover:opacity-100 hover:text-neutral-600 focus:opacity-100'
      }`}
    >
      <Flag
        className={`w-3.5 h-3.5 ${mustGo ? 'fill-red-500' : 'fill-transparent'}`}
        strokeWidth={2}
      />
    </button>
  ) : null;

  // When the user prints the OrdersList directly (isPrint=false + @media
  // print), render a small quiet black flag next to the code so the
  // priority is still visible on paper. The dedicated PrintView handles
  // its own flag in the PRODUCT column at TableRow level, so this branch
  // intentionally skips isPrint=true.
  const printFlag = mustGo && !isPrint ? (
    <Flag
      className="hidden print:inline-block align-middle mr-1 w-3 h-3 fill-black text-black"
      strokeWidth={2}
    />
  ) : null;

  let codeContent: React.ReactNode;
  if (details) {
    codeContent = (
      <>
        <strong>{details.newCode}</strong> ({details.oldCode}){locationSuffix}
      </>
    );
  } else if (manualDetails?.secondaryCode) {
    codeContent = (
      <>
        <strong>{code}</strong> ({manualDetails.secondaryCode}){locationSuffix}
      </>
    );
  } else {
    codeContent = (
      <>
        <strong>{code}</strong>{locationSuffix}
      </>
    );
  }

  return (
    <span className="inline-flex items-center">
      {flag}
      {printFlag}
      <span>{codeContent}</span>
    </span>
  );
};
