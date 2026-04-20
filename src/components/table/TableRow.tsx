import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Location, OrderProduct, Product } from '@/types';
import { getProductDetails } from '@/utils';
import { ProductName, ProductCode, ProductOutput, ProductDetailsForm } from '../product';
import { formatRValue } from '@/utils';
import { useState } from 'react';
import { formatLocationCodes, hasAwningCode, stripAwningCodes } from '@/utils/locations';

interface TableRowProps {
  product: OrderProduct;
  productData: Product[];
  onUpdateProduct?: (product: OrderProduct) => void;
  onToggleMustGo?: () => Promise<void> | void;
  locations?: string[];
  allLocations?: Location[];
  isPrint?: boolean;
}

export const TableRow: React.FC<TableRowProps> = ({
  product,
  productData,
  onUpdateProduct,
  onToggleMustGo,
  locations = [],
  allLocations = [],
  isPrint = false
}) => {
  const details = getProductDetails(product.productCode, productData);
  const [isEditing, setIsEditing] = useState(false);
  const isAwning = hasAwningCode(locations, allLocations);
  // AWNING items render (A) in Output; their codes are omitted from the CODE
  // column. Non-AWNING codes still render there in their compact form.
  const codeLocation = formatLocationCodes(
    stripAwningCodes(locations, allLocations),
    allLocations
  ) || undefined;

  const handleSaveDetails = (manualDetails: OrderProduct['manualDetails']) => {
    if (onUpdateProduct) {
      onUpdateProduct({
        ...product,
        manualDetails
      });
    }
    setIsEditing(false);
  };
  
  const mustGo = !!product.mustGo;
  // Print view uses a heavier 4px border + a light tint so the row is
  // obviously flagged even once the on-screen hover/pill cues are gone.
  // Actual paper still prints the border (real border, always prints) and
  // suppresses the tint so it doesn't depend on "background graphics".
  const mustGoCellClasses = mustGo
    ? isPrint
      ? 'border-l-[4px] border-red-600 bg-red-50/60 print:bg-transparent'
      : 'border-l-[3px] border-red-500 bg-red-50/40 print:bg-transparent'
    : '';

  // Rows whose code wasn't in the catalogue get a small red alert icon next
  // to the "Unknown Product" label so they're easy to spot at a glance.
  const isUnknown = !details && product.manualDetails?.type === 'Unknown';
  const unknownIcon = isUnknown ? (
    <AlertCircle
      className="w-3.5 h-3.5 text-red-500 shrink-0 print:text-black"
      strokeWidth={2.25}
      aria-label="Unknown product"
    />
  ) : null;

  return (
    <tr className="group border-t border-neutral-100 hover:bg-neutral-50/60 transition-colors print:table-row print:hover:bg-transparent">
      {/* Desktop & Print View */}
      <td className="hidden sm:table-cell px-3 py-3 truncate text-sm text-neutral-800">
        {!details && !isEditing && product.manualDetails ? (
          <div>
            <div className="font-medium text-neutral-900 flex items-center gap-1.5">
              {unknownIcon}
              <span>{product.manualDetails.category}</span>
            </div>
            <div className="text-xs text-neutral-500">
              {product.manualDetails.description}
            </div>
          </div>
        ) : (
          <ProductName
            details={details}
            code={product.productCode}
            onAddDetails={!details && !product.manualDetails ? () => setIsEditing(true) : undefined}
          />
        )}
        {isEditing && (
          <ProductDetailsForm
            onSave={handleSaveDetails}
            onCancel={() => setIsEditing(false)}
          />
        )}
      </td>
      <td
        className={`hidden sm:table-cell px-3 py-3 truncate text-sm text-neutral-700 tabular-nums ${mustGoCellClasses}`}
      >
        <ProductCode
          details={details}
          code={product.productCode}
          manualDetails={product.manualDetails}
          location={codeLocation}
          mustGo={mustGo}
          onToggleMustGo={onToggleMustGo}
          isPrint={isPrint}
        />
      </td>
      <td className="hidden sm:table-cell px-3 py-3 truncate text-sm text-neutral-800 tabular-nums">{product.packsOrdered}</td>
      <td className="hidden sm:table-cell px-3 py-3 truncate text-sm text-neutral-900 font-medium tabular-nums">
        <ProductOutput
          code={product.productCode}
          packs={product.packsOrdered}
          productData={productData}
          manualDetails={product.manualDetails}
          isAwning={isAwning}
        />
      </td>

      {/* Mobile View */}
      <td className={`sm:hidden px-3 py-3 space-y-1 ${mustGoCellClasses}`} colSpan={4}>
        <div className="flex justify-between items-start">
          <div className="max-w-[60%] pr-2">
            {details || product.manualDetails ? (
              <div className="font-medium text-sm text-neutral-900">
                {details ? (
                  <>
                    {formatRValue(details.rValue)}
                    {details.width && (
                      <span className="text-neutral-500 ml-1 font-normal">({details.width})</span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1.5">
                      {unknownIcon}
                      <span>{product.manualDetails?.category}</span>
                    </span>
                    <div className="text-xs text-neutral-500 break-words font-normal">
                      {product.manualDetails?.description}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div>
                <span className="text-sm text-red-600">⚠️ Unknown product</span>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="ml-2 text-xs text-neutral-700 underline hover:text-neutral-900"
                  >
                    Add details
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="font-medium text-sm text-neutral-900">
              <ProductOutput
                code={product.productCode}
                packs={product.packsOrdered}
                productData={productData}
                manualDetails={product.manualDetails}
                isAwning={isAwning}
              />
            </div>
            <div className="text-xs text-neutral-500 tabular-nums">
              <ProductCode
                details={details}
                code={product.productCode}
                manualDetails={product.manualDetails}
                location={codeLocation}
                mustGo={mustGo}
                onToggleMustGo={onToggleMustGo}
                isPrint={isPrint}
              />
            </div>
          </div>
        </div>
        {isEditing && (
          <ProductDetailsForm
            onSave={handleSaveDetails}
            onCancel={() => setIsEditing(false)}
          />
        )}
      </td>
    </tr>
  );
};