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

  // Interactive screen flag — hidden on the print view (the pill badge
  // takes over there) and when actually printing.
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

  // Print-view / paper treatment: a small red "MUST GO" pill with a flag
  // icon. Border + text colour print reliably even without "background
  // graphics" enabled, so this badge survives the trip to paper intact.
  const mustGoBadge = mustGo && isPrint ? (
    <span
      className="mr-1.5 inline-flex items-center gap-1 align-middle rounded-full border border-red-500 px-1.5 py-[1px] text-[10px] font-bold uppercase tracking-wide text-red-600 leading-none"
      aria-label="Must go"
    >
      <Flag
        className="w-2.5 h-2.5 fill-red-600 text-red-600"
        strokeWidth={2.25}
      />
      Must go
    </span>
  ) : null;

  // Small flag-only fallback when the badge isn't showing (i.e. the non-
  // print OrdersList). This is the quiet on-paper marker kept from before
  // so paper copies still show priority when users print the OrdersList
  // directly rather than via the Print page.
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
    <span className={`inline-flex items-center ${mustGo && isPrint ? 'font-semibold text-red-700' : ''}`}>
      {flag}
      {mustGoBadge}
      {printFlag}
      <span>{codeContent}</span>
    </span>
  );
};
