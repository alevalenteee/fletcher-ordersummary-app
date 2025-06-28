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
    
    const prompt = `Analyze this delivery manifest PDF and extract the following information in a strict JSON format. Pay special attention to the delivery address, manifest/delivery number, transport company, trailer information, and product descriptions.
    
    Required format:
    {
      "destination": "string (the delivery suburb/location in CAPITALS)",
      "manifestNumber": "string (the delivery manifest number from the document header)",
      "transportCompany": "string (the transport company name found near the word 'CARRIER' in the document)",
      "trailerType": "string (trailer type from VEHICLE section, e.g., B_DOUBLE, TRUCK, SEMI)",
      "trailerSize": "string (trailer size from VEHICLE section, e.g., 173M3, 120M3)",
      "time": "HH:MM (24-hour format time, usually found in the top right of the PDF)",
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
    2. DESTINATION: Analyze the delivery address carefully. If the address contains any of these known locations (ARNDELL, BANYO, SALISBURY, DERRIMUT, MOONAH, JANDAKOT, GEPPS CROSS, BARON, SHEPPARTON, EE-FIT, CANBERRA), use that exact name. Otherwise, extract the SUBURB name from the delivery address and return it in CAPITALS.
    3. IMPORTANT: Extract the manifest/delivery number from the document header. This is typically labeled as "Delivery Number", "Manifest #", or similar
    4. IMPORTANT: Look for the transport company name that appears near or next to the word "CARRIER" in the document. Extract the company name with proper spacing (e.g., "ABC Transport", "XYZ Logistics")
    5. TRAILER INFORMATION: Look for vehicle/trailer information anywhere in the PDF, particularly in sections labeled "VEHICLE", "TRUCK", "TRAILER", or similar. Extract:
       - Trailer Type: Look for vehicle/trailer type descriptions such as "B_DOUBLE", "B-DOUBLE", "BDOUBLE", "TRUCK", "SEMI", "RIGID", "PANTECH"
       - Trailer Size: Look for size/capacity information in cubic meters, typically formatted as "173M3", "120M3", "85M3" or similar
       - The information might be in a table, list, or free text format
       - Search the entire document if no dedicated VEHICLE section exists
       - If no trailer information is found, leave these fields empty
    6. CRITICAL: Extract the TIME in 24-hour format (HH:MM) from the document. This is usually located in the top right area of the PDF. Look for times like "08:30", "14:15", "07:00", etc. If no time is found, use "00:00" as fallback.
    7. Look for product codes that start with either '20' or '40' or '10'
    8. Pack quantities MUST be valid numbers
    9. Products array MUST NOT be empty
    10. Each product MUST have both productCode and packsOrdered
    11. Look for product codes and quantities in the delivery details or line items
    12. Extract ALL product codes and quantities that match the format
    13. For any product code that's not recognized, analyze the surrounding text and provide a description of the product
    14. Look for details like:
        - Product type (e.g., insulation, batts, rolls)
        - Dimensions or specifications
        - Any other identifying characteristics
    15. If no transport company is found near "CARRIER", leave transportCompany empty or omit it
    16. For destination: Focus on the delivery address - extract the suburb/city name and ensure it's in CAPITALS

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
      
      // Clean and validate trailer type
      if (parsedOrder.trailerType !== undefined) {
        // Clean up trailer type - remove any unwanted characters and whitespace
        parsedOrder.trailerType = String(parsedOrder.trailerType).trim();
        
        if (!parsedOrder.trailerType) {
          delete parsedOrder.trailerType; // Remove if empty after cleaning
        }
      }
      
      // Clean and validate trailer size
      if (parsedOrder.trailerSize !== undefined) {
        // Clean up trailer size - remove any unwanted characters and whitespace
        parsedOrder.trailerSize = String(parsedOrder.trailerSize).trim();
        
        if (!parsedOrder.trailerSize) {
          delete parsedOrder.trailerSize; // Remove if empty after cleaning
        }
      }
      
      // Validate and set time
      if (!parsedOrder.time || parsedOrder.time === "" || parsedOrder.time === "00:00") {
        // If no time was extracted, use "00:00" as fallback
        parsedOrder.time = "00:00";
      } else {
        // Validate time format (HH:MM)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(parsedOrder.time)) {
          console.warn(`Invalid time format extracted: ${parsedOrder.time}, using fallback 00:00`);
          parsedOrder.time = "00:00";
        }
      }
      
      if (!Array.isArray(parsedOrder.products) || parsedOrder.products.length === 0) {
        throw new Error('Order must contain at least one product');
      }
      
      // Clean and validate destination
      const cleanDestination = String(parsedOrder.destination).trim().toUpperCase();
      
      // Known hardcoded destinations that we want to preserve exactly
      const knownDestinations = [
        'ARNDELL', 'BANYO', 'SALISBURY', 'DERRIMUT', 'MOONAH',
        'JANDAKOT', 'GEPPS CROSS', 'BARON', 'SHEPPARTON', 'EE-FIT', 'CANBERRA'
      ];

      // Check if destination matches any known destinations or contains them
      let finalDestination = cleanDestination;
      
      // Check if any known destination is contained in the extracted destination
      const matchedKnownDestination = knownDestinations.find(known => 
        cleanDestination.includes(known) || cleanDestination === known
      );
      
      if (matchedKnownDestination) {
        finalDestination = matchedKnownDestination;
      }
      // If no known destination matches, use the cleaned extracted destination as-is
      // This allows for new suburbs/locations to be displayed
      
      parsedOrder.destination = finalDestination;
      
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

