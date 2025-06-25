import { GoogleGenerativeAI } from '@google/generative-ai';
import { Order, Product, OrderProduct } from '@/types';

// Interface for Gemini API response product
interface GeminiProduct extends Partial<OrderProduct> {
  description?: string;
}

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

export async function analyzePDFContent(
  base64PDF: string, 
  productData: Product[]
): Promise<Order | null> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `Analyze this delivery manifest PDF and extract the following information in a strict JSON format. Pay special attention to the manifest/delivery number, transport company, and product descriptions.
    
    Required format:
    {
      "destination": "string (one of: ARNDELL, BANYO, SALISBURY, DERRIMUT, MOONAH, JANDAKOT, GEPPS CROSS, BARON, SHEPPARTON, EE-FIT, CANBERRA)",
      "manifestNumber": "string (the delivery manifest number from the document header)",
      "transportCompany": "string (the transport company name found near the word 'CARRIER' in the document)",
      "time": "00:00",
      "products": [
        {
          "productCode": "string (can start with '20' or '40' or '10')",
          "packsOrdered": "string (must be a valid number)",
          "description": "string (describe the product if code is not recognized)"
        }
      ]
    }

    Strict Requirements:
    1. Response MUST be valid JSON
    2. Destination MUST exactly match one of the allowed values (case-sensitive)
    3. IMPORTANT: If you see "CANBERRA", "HUME", or "ACT" in the delivery address, use "CANBERRA" as the destination
    4. IMPORTANT: Extract the manifest/delivery number from the document header. This is typically labeled as "Delivery Number", "Manifest #", or similar
    5. IMPORTANT: Look for the transport company name that appears near or next to the word "CARRIER" in the document. Extract the company name with proper spacing (e.g., "ABC Transport", "XYZ Logistics")
    6. Look for product codes that start with either '20' or '40' or '10'
    7. Pack quantities MUST be valid numbers
    8. Products array MUST NOT be empty
    9. Each product MUST have both productCode and packsOrdered
    10. Look for product codes and quantities in the delivery details or line items
    11. Time will always be "00:00" as it's not required
    12. Extract ALL product codes and quantities that match the format
    13. For any product code that's not recognized, analyze the surrounding text and provide a description of the product
    14. Look for details like:
        - Product type (e.g., insulation, batts, rolls)
        - Dimensions or specifications
        - Any other identifying characteristics
    15. If no transport company is found near "CARRIER", leave transportCompany empty or omit it

    Extract ONLY the required information in the exact format specified. Return ONLY the JSON object, nothing else.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "application/pdf",
          data: base64PDF
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    
    try {
      // Attempt to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Gemini response');
      }
      
      let parsedOrder: any;
      try {
        parsedOrder = JSON.parse(jsonMatch[0]);
      } catch (e) {
        throw new Error('Failed to parse JSON from Gemini response');
      }
      
      // Validate required fields
      if (!parsedOrder.destination) {
        throw new Error('Missing destination in order');
      }
      
      // Clean and validate manifest number
      if (parsedOrder.manifestNumber !== undefined) {
        // Clean up manifest number - remove any unwanted characters and whitespace
        parsedOrder.manifestNumber = String(parsedOrder.manifestNumber).trim();
        
        if (!parsedOrder.manifestNumber) {
          delete parsedOrder.manifestNumber; // Remove if empty after cleaning
        }
      }
      
      // Clean and validate transport company
      if (parsedOrder.transportCompany !== undefined) {
        // Clean up transport company - remove any unwanted characters and whitespace
        parsedOrder.transportCompany = String(parsedOrder.transportCompany).trim();
        
        if (!parsedOrder.transportCompany) {
          delete parsedOrder.transportCompany; // Remove if empty after cleaning
        }
      }
      
      // Set default time since it's not required
      parsedOrder.time = "00:00";
      
      if (!Array.isArray(parsedOrder.products) || parsedOrder.products.length === 0) {
        throw new Error('Order must contain at least one product');
      }
      
      // Validate destination against allowed values
      const validDestinations = [
        'ARNDELL', 'BANYO', 'SALISBURY', 'DERRIMUT', 'MOONAH',
        'JANDAKOT', 'GEPPS CROSS', 'BARON', 'SHEPPARTON', 'EE-FIT', 'CANBERRA'
      ];

      // Check if the destination contains CANBERRA, HUME, or ACT and normalize to CANBERRA
      const upperDestination = parsedOrder.destination.toUpperCase();
      if (upperDestination.includes('CANBERRA') || upperDestination.includes('HUME') || upperDestination.includes('ACT')) {
        parsedOrder.destination = 'CANBERRA';
      } else if (!validDestinations.includes(upperDestination)) {
        // Find closest match
        const closest = validDestinations.reduce((prev, curr) => {
          const prevDiff = levenshteinDistance(upperDestination, prev);
          const currDiff = levenshteinDistance(upperDestination, curr);
          return currDiff < prevDiff ? curr : prev;
        });
        throw new Error(`Invalid destination. Did you mean "${closest}"?`);
      }
      
      // Validate products
      parsedOrder.products = parsedOrder.products.filter((product: GeminiProduct) => {
        if (!product.productCode || !product.packsOrdered) return false;

        const code = product.productCode.trim();
        const isValidFormat = code.startsWith('20') || code.startsWith('40') || code.startsWith('10');
        
        if (!isValidFormat) {
          console.warn(`Skipping product with invalid code format: ${code}`);
          return false;
        }
        
        // Try to match against both new and old codes
        const isValidProduct = productData.some(p => 
          p.newCode === code || p.oldCode === code
        );

        if (!isValidProduct) {
          // Extract description from the response
          const description = product.description || 'Unknown product';
          
          // Extract any codes in parentheses from the description
          const codeInParenthesesMatch = description.match(/\(([^)]+)\)/);
          const secondaryCode = codeInParenthesesMatch ? codeInParenthesesMatch[1].trim() : '';
          
          console.warn(`Unknown product code found: ${code}`);
          product.manualDetails = {
            type: 'Unknown',
            category: 'Unknown Product',
            description,
            secondaryCode, // Store any code found in parentheses
            packsPerBale: 1 // Set packsPerBale to 1 to ensure output is displayed as units
          };
        }
        
        return true;
      });
      
      if (parsedOrder.products.length === 0) {
        throw new Error('No products found in order');
      }
      
      return parsedOrder as Order;
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

// Helper function to find closest matching destination
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  return matrix[b.length][a.length];
}