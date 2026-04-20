import { GoogleGenAI, Type } from '@google/genai';
import { Order, Product, OrderProduct } from '@/types';

interface GeminiProduct extends Partial<OrderProduct> {
  description?: string;
}

const GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';

const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
});

const ORDER_SCHEMA = {
  type: Type.OBJECT,
  required: ['destination', 'time', 'products'],
  properties: {
    destination: { type: Type.STRING },
    manifestNumber: { type: Type.STRING, nullable: true },
    transportCompany: { type: Type.STRING, nullable: true },
    trailerType: { type: Type.STRING, nullable: true },
    trailerSize: { type: Type.STRING, nullable: true },
    time: { type: Type.STRING },
    products: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        // description is required on every product. If the code isn't in our
        // catalogue, this is the only thing giving staff a human-readable
        // name on screen and in print, so we force the model to always fill
        // it in rather than letting it decide when it's "needed".
        required: ['productCode', 'packsOrdered', 'description'],
        properties: {
          productCode: { type: Type.STRING },
          packsOrdered: { type: Type.STRING },
          description: { type: Type.STRING },
        },
      },
    },
  },
};

export async function analyzePDFContent(
  base64PDF: string,
  productData: Product[],
  destinations: string[]
): Promise<Order | null> {
  try {
    const destinationsList = destinations.length > 0
      ? destinations.join(', ')
      : '(none configured)';

    const prompt = `Extract a delivery order from this manifest PDF.

- destination: delivery suburb in CAPITALS. If it matches any of [${destinationsList}], use that exact entry.
- manifestNumber: the Delivery/Manifest number from the document header.
- transportCompany: the name appearing near the word "CARRIER".
- trailerType: from the VEHICLE section (e.g. B_DOUBLE, TRUCK, SEMI, RIGID, PANTECH).
- trailerSize: cubic-metre capacity from the VEHICLE section (e.g. 173M3, 120M3).
- time: the HH:MM 24-hour time, usually top-right of the page. If absent, use 00:00.
- products: every line item with a product code starting with 10, 20 or 40. For every product return:
    • productCode: the main product code.
    • packsOrdered: the pack quantity.
    • description: REQUIRED for every product — copy the product description / name text that appears on the manifest next to this code (e.g. "CEILING R4.1 580mm", "PINKSOUNDBREAK R2.7 430"). Include any visible dimensions, R-value, colour, and any secondary code in round parentheses like "(4008080)". Never leave this blank, even if the code looks familiar.`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: prompt },
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64PDF,
          },
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: ORDER_SCHEMA,
        temperature: 0,
      },
    });

    const text = response.text ?? '';

    try {
      let parsedOrder: any;
      try {
        parsedOrder = JSON.parse(text);
      } catch (e) {
        throw new Error('Failed to parse JSON from Gemini response');
      }

      if (!parsedOrder.destination) {
        throw new Error('Missing destination in order');
      }

      // Trim optional string fields; drop them if empty or null so downstream
      // consumers see "undefined" (same contract as before the refactor).
      const trimOrDrop = (key: 'manifestNumber' | 'transportCompany' | 'trailerType' | 'trailerSize') => {
        const raw = parsedOrder[key];
        if (raw === undefined || raw === null) {
          delete parsedOrder[key];
          return;
        }
        const cleaned = String(raw).trim();
        if (cleaned) parsedOrder[key] = cleaned;
        else delete parsedOrder[key];
      };
      trimOrDrop('manifestNumber');
      trimOrDrop('transportCompany');
      trimOrDrop('trailerType');
      trimOrDrop('trailerSize');

      // Validate and set time — keep the "00:00" fallback behaviour.
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!parsedOrder.time || parsedOrder.time === '' || !timeRegex.test(parsedOrder.time)) {
        if (parsedOrder.time && parsedOrder.time !== '00:00') {
          console.warn(`Invalid time format extracted: ${parsedOrder.time}, using fallback 00:00`);
        }
        parsedOrder.time = '00:00';
      }

      if (!Array.isArray(parsedOrder.products) || parsedOrder.products.length === 0) {
        throw new Error('Order must contain at least one product');
      }

      // Clean and validate destination
      const cleanDestination = String(parsedOrder.destination).trim().toUpperCase();

      // Sorted longest-first so e.g. "GEPPS CROSS" matches before "GEPPS" would
      // if a user ever added a shorter overlapping entry.
      const knownDestinations = [...destinations]
        .map(d => d.toUpperCase())
        .sort((a, b) => b.length - a.length);

      const matchedKnownDestination = knownDestinations.find(known =>
        cleanDestination.includes(known) || cleanDestination === known
      );

      // If no known destination matches, use the cleaned extracted destination as-is.
      // This allows new suburbs/locations to be displayed.
      parsedOrder.destination = matchedKnownDestination ?? cleanDestination;

      // Validate products — unknown codes keep their description + parenthesised
      // secondary code via manualDetails, exactly as before.
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
          // Gemini is now required by the schema to return a description for
          // every product. We still defensively fall back in case the model
          // ever breaks the contract so the row remains useful to the user.
          const rawDescription = (product.description ?? '').trim();

          // Extract any secondary code in parentheses (e.g. "(4008080)") so
          // it renders in the CODE column, then remove it from the visible
          // description to avoid showing the same code twice on the row.
          const codeInParenthesesMatch = rawDescription.match(/\(([^)]+)\)/);
          const secondaryCode = codeInParenthesesMatch
            ? codeInParenthesesMatch[1].trim()
            : '';
          const cleanedDescription = rawDescription
            .replace(/\s*\([^)]*\)\s*/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          // The bold line in the row is `category`. Keep that as the
          // "Unknown product" tag so rows flagged for catalogue attention
          // stand out at a glance, and put the real PDF text in the muted
          // subtitle so staff can still identify the item.
          console.warn(`Unknown product code found: ${code}`);
          product.manualDetails = {
            type: 'Unknown',
            category: 'Unknown Product',
            description: cleanedDescription || 'No description provided',
            secondaryCode,
            packsPerBale: 1,
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
