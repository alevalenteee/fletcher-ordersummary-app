import React from 'react';
import { AlertCircle, Database, Flag, Plus } from 'lucide-react';
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
  // When set and the row represents a product that isn't in the catalogue
  // (either Unknown via AI, or a manually-described row), a hover-reveal
  // "Add to database" button appears that calls this with the row's order
  // product so the parent can open the catalogue modal prefilled.
  onAddToCatalogue?: (product: OrderProduct) => void;
}

export const TableRow: React.FC<TableRowProps> = ({
  product,
  productData,
  onUpdateProduct,
  onToggleMustGo,
  locations = [],
  allLocations = [],
  isPrint = false,
  onAddToCatalogue
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
  // OrdersList (non-print) keeps the established red left bar + light tint
  // on the CODE cell. The dedicated Print view deliberately skips all of
  // that — a single small red flag rendered to the left of the PRODUCT
  // column is enough to flag priority on paper without the background
  // noise, heavy borders, and red text turning each row into a stripe.
  const mustGoCellClasses = mustGo && !isPrint
    ? 'border-l-[3px] border-red-500 bg-red-50/40 print:bg-transparent'
    : '';

  // Small red filled flag icon shown at the very start of the CODE column
  // in print view only. Sits inline before the product code, mirroring the
  // OrderList screen flag so the two views stay visually linked without
  // the print card being a wall of red.
  const mustGoPrintFlag = mustGo && isPrint ? (
    <Flag
      className="w-3 h-3 fill-red-600 text-red-600 inline-block align-middle mr-1.5 shrink-0"
      strokeWidth={2.25}
      aria-label="Must go"
    />
  ) : null;

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

  // Show the "Add to database" affordance whenever the row has manualDetails
  // (AI-detected Unknown or user-described) and the parent wired up the
  // handler. Suppressed in print view — this is an edit affordance.
  const canAddToCatalogue =
    !details && !!product.manualDetails && !!onAddToCatalogue && !isPrint;

  const handleAddToCatalogue = (e: React.MouseEvent) => {
    // Rows may register other row-level click handlers in the future; stop
    // propagation so the button stays a self-contained action.
    e.stopPropagation();
    if (onAddToCatalogue) onAddToCatalogue(product);
  };

  return (
    <tr className="group border-t border-neutral-100 hover:bg-neutral-50/60 transition-colors print:table-row print:hover:bg-transparent">
      {/* Desktop & Print View */}
      <td className="hidden sm:table-cell px-3 py-3 text-sm text-neutral-800">
        {!details && !isEditing && product.manualDetails ? (
          <div className="flex items-start justify-between gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              <div className="font-medium text-neutral-900 flex items-center gap-1.5 truncate">
                {unknownIcon}
                <span className="truncate">{product.manualDetails.category}</span>
              </div>
              <div className="text-xs text-neutral-500 truncate">
                {product.manualDetails.description}
              </div>
            </div>
            {canAddToCatalogue && (
              <button
                type="button"
                onClick={handleAddToCatalogue}
                title="Add this product to the catalogue"
                aria-label="Add to database"
                className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-neutral-700 bg-white border border-neutral-200 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto hover:bg-neutral-50 hover:border-neutral-300 transition-opacity print:hidden"
              >
                <span className="relative inline-flex items-center justify-center">
                  <Database className="w-3 h-3" strokeWidth={2} />
                  <Plus
                    className="w-2 h-2 absolute -top-0.5 -right-1 text-neutral-700"
                    strokeWidth={3}
                  />
                </span>
                <span>Add to database</span>
              </button>
            )}
          </div>
        ) : (
          <div className="truncate">
            <ProductName
              details={details}
              code={product.productCode}
              onAddDetails={!details && !product.manualDetails ? () => setIsEditing(true) : undefined}
            />
          </div>
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
        {mustGoPrintFlag}
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
                    {canAddToCatalogue && (
                      <button
                        type="button"
                        onClick={handleAddToCatalogue}
                        className="mt-1.5 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                      >
                        <span className="relative inline-flex items-center justify-center">
                          <Database className="w-3 h-3" strokeWidth={2} />
                          <Plus
                            className="w-2 h-2 absolute -top-0.5 -right-1 text-neutral-700"
                            strokeWidth={3}
                          />
                        </span>
                        <span>Add to database</span>
                      </button>
                    )}
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