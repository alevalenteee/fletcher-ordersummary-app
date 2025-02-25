import React from 'react';
import { OrderProduct, Product } from '@/types';
import { getProductDetails } from '@/utils';
import { ProductName, ProductCode, ProductOutput, ProductDetailsForm } from '../product';
import { formatRValue } from '@/utils';
import { useState } from 'react';

interface TableRowProps {
  product: OrderProduct;
  productData: Product[];
  onUpdateProduct?: (product: OrderProduct) => void;
}

export const TableRow: React.FC<TableRowProps> = ({ 
  product, 
  productData,
  onUpdateProduct 
}) => {
  const details = getProductDetails(product.productCode, productData);
  const [isEditing, setIsEditing] = useState(false);

  const handleSaveDetails = (manualDetails: OrderProduct['manualDetails']) => {
    if (onUpdateProduct) {
      onUpdateProduct({
        ...product,
        manualDetails
      });
    }
    setIsEditing(false);
  };
  
  return (
    <tr className="border-t even:bg-gray-50 print:table-row">
      {/* Desktop & Print View */}
      <td className="hidden sm:table-cell p-3 truncate text-base">
        {!details && !isEditing && product.manualDetails ? (
          <div>
            <div className="font-medium">{product.manualDetails.category}</div>
            <div className="text-sm text-gray-600">
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
      <td className="hidden sm:table-cell p-3 truncate text-base">
        <ProductCode 
          details={details} 
          code={product.productCode} 
          manualDetails={product.manualDetails}
        />
      </td>
      <td className="hidden sm:table-cell p-3 truncate text-base">{product.packsOrdered}</td>
      <td className="hidden sm:table-cell p-3 truncate text-base">
        <ProductOutput 
          code={product.productCode}
          packs={product.packsOrdered}
          productData={productData}
          manualDetails={product.manualDetails}
        />
      </td>
      
      {/* Mobile View */}
      <td className="sm:hidden p-3 space-y-1" colSpan={4}>
        <div className="flex justify-between items-start">
          <div className="max-w-[60%] pr-2">
            {details || product.manualDetails ? (
              <div className="font-medium">
                {details ? (
                  <>
                    {formatRValue(details.rValue)}
                    {details.width && (
                      <span className="text-gray-500 ml-1">({details.width})</span>
                    )}
                  </>
                ) : (
                  <>
                    {product.manualDetails?.category}
                    <div className="text-sm text-gray-600 break-words">
                      {product.manualDetails?.description}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div>
                <span className="text-red-600">⚠️ Unknown Product</span>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="ml-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    Add Details
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="font-medium">
              <ProductOutput 
                code={product.productCode}
                packs={product.packsOrdered}
                productData={productData}
                manualDetails={product.manualDetails}
              />
            </div>
            <div className="text-sm text-gray-500">
              <ProductCode 
                details={details} 
                code={product.productCode} 
                manualDetails={product.manualDetails}
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