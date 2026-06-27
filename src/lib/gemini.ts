import { GoogleGenAI, Type } from '@google/genai';
import { Order, Product, OrderProduct, SplitLoad, SplitLoadStop } from '@/types';

interface GeminiProduct extends Partial<OrderProduct> {
  description?: string;
}

interface GeminiDeliveryGroup {
  deliveryAddress?: string;
  destination?: string;
  products?: GeminiProduct[];
}

const GEMINI_MODEL = 'gemini-3.1-flash-lite';

const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
});

const PRODUCT_ITEM_SCHEMA = {
  type: Type.OBJECT,
  required: ['productCode', 'packsOrdered', 'description'],
  properties: {
    productCode: { type: Type.STRING },
    packsOrdered: { type: Type.STRING },
    description: { type: Type.STRING },
  },
};

const ORDER_SCHEMA = {
  type: Type.OBJECT,
  required: ['destination', 'time', 'deliveryGroups'],
  properties: {
    destination: { type: Type.STRING },
    manifestNumber: { type: Type.STRING, nullable: true },
    transportCompany: { type: Type.STRING, nullable: true },
    trailerType: { type: Type.STRING, nullable: true },
    trailerSize: { type: Type.STRING, nullable: true },
    time: { type: Type.STRING },
    deliveryGroups: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ['deliveryAddress', 'destination', 'products'],
        properties: {
          deliveryAddress: { type: Type.STRING },
          destination: { type: Type.STRING },
          products: {
            type: Type.ARRAY,
            items: PRODUCT_ITEM_SCHEMA,
          },
        },
      },
    },
  },
};

/** Match extracted suburb text against configured destination names. */
function matchDestination(raw: string, destinations: string[]): string {
  const clean = String(raw).trim().toUpperCase();
  const known = [...destinations]
    .map(d => d.toUpperCase())
    .sort((a, b) => b.length - a.length);

  const matched = known.find(known =>
    clean.includes(known) || clean === known
  );
  return matched ?? clean;
}

/** Validate and enrich a single product line from Gemini output. */
function validateProduct(product: GeminiProduct, productData: Product[]): OrderProduct | null {
  if (!product.productCode || !product.packsOrdered) return null;

  const code = product.productCode.trim();
  const isValidFormat = code.startsWith('20') || code.startsWith('40') || code.startsWith('10');

  if (!isValidFormat) {
    console.warn(`Skipping product with invalid code format: ${code}`);
    return null;
  }

  const isValidProduct = productData.some(p =>
    p.newCode === code || p.oldCode === code
  );

  const result: OrderProduct = {
    productCode: code,
    packsOrdered: String(product.packsOrdered).trim(),
  };

  if (!isValidProduct) {
    const rawDescription = (product.description ?? '').trim();
    const codeInParenthesesMatch = rawDescription.match(/\(([^)]+)\)/);
    const secondaryCode = codeInParenthesesMatch
      ? codeInParenthesesMatch[1].trim()
      : '';

    const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const cleanedDescription = rawDescription
      .replace(/\s*\([^)]*\)\s*/g, ' ')
      .replace(new RegExp(`\\b${escapedCode}\\b`, 'g'), ' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.warn(`Unknown product code found: ${code}`);
    result.manualDetails = {
      type: 'Unknown',
      category: 'Unknown Product',
      description: cleanedDescription || 'No description provided',
      secondaryCode,
      packsPerBale: 1,
    };
  }

  return result;
}

/** Flatten delivery groups into products[] and optional splitLoad metadata. */
function buildOrderFromGroups(
  groups: GeminiDeliveryGroup[],
  destinations: string[],
  productData: Product[]
): { products: OrderProduct[]; splitLoad?: SplitLoad } {
  const products: OrderProduct[] = [];
  const stops: SplitLoadStop[] = [];

  for (const group of groups) {
    const rawProducts = Array.isArray(group.products) ? group.products : [];
    const productIndexes: number[] = [];

    for (const raw of rawProducts) {
      const validated = validateProduct(raw, productData);
      if (!validated) continue;
      productIndexes.push(products.length);
      products.push(validated);
    }

    if (productIndexes.length === 0) continue;

    const deliveryAddress = String(group.deliveryAddress ?? '').trim();
    const destination = matchDestination(
      group.destination ?? deliveryAddress,
      destinations
    );

    stops.push({
      deliveryAddress: deliveryAddress || destination,
      destination,
      trailer: null,
      productIndexes,
    });
  }

  const splitLoad = stops.length > 1 ? { stops } : undefined;
  return { products, splitLoad };
}

export async function analyzePDFContent(
  base64PDF: string,
  productData: Product[],
  destinations: string[]
): Promise<Order | null> {
  try {
    const destinationsList = destinations.length > 0
      ? destinations.join(', ')
      : '(none configured)';

    const prompt = `Extract a delivery order from this Fletcher Insulation load manifest PDF.

IMPORTANT — addresses:
- IGNORE the Fletcher depot / origin address at the top-left (e.g. "FI - Dandenong - EWM", Frankston-Dandenong Rd, Dandenong). That is where we ship FROM, not a delivery destination.
- ONLY use addresses from the manifest TABLE under the "Delivery Address" column. These are the real delivery stops.
- A manifest may have ONE delivery address block (standard load) or MULTIPLE delivery address blocks (split load). Each block has an address on its row and product line items on the same row and rows below it until the next delivery address or a subtotal/total row.
- Products belong to the nearest delivery-address block ABOVE them in the table.

Return deliveryGroups: one entry per delivery-address block, in top-to-bottom order. For each group:
- deliveryAddress: the full delivery address text from the manifest table (e.g. "FI - Shepparton, 62 Florence Street Shepparton VIC 3630").
- destination: the delivery suburb/location name in CAPITALS. If it matches any of [${destinationsList}], use that exact entry.
- products: every line item in that block with a product code starting with 10, 20 or 40. For every product return:
    • productCode: the main product code.
    • packsOrdered: the pack quantity.
    • description: REQUIRED — copy ONLY the human-readable product description from the manifest (e.g. "Pink Batts R4.1 1160X430X215 10PK"). Include dimensions, R-value, colour, and secondary codes in parentheses like "(901414)". DO NOT include the main productCode in the description.

Also return order-level fields from the document header:
- destination: use the FIRST delivery group's destination (primary order destination).
- manifestNumber: the Delivery/Manifest number from the document header.
- transportCompany: the name appearing near the word "CARRIER".
- trailerType: from the VEHICLE section (e.g. B_DOUBLE, TRUCK, SEMI, RIGID, PANTECH).
- trailerSize: cubic-metre capacity from the VEHICLE section (e.g. 173M3, 120M3).
- time: the HH:MM 24-hour time, usually top-right of the page. If absent, use 00:00.`;

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
      } catch {
        throw new Error('Failed to parse JSON from Gemini response');
      }

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

      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!parsedOrder.time || parsedOrder.time === '' || !timeRegex.test(parsedOrder.time)) {
        if (parsedOrder.time && parsedOrder.time !== '00:00') {
          console.warn(`Invalid time format extracted: ${parsedOrder.time}, using fallback 00:00`);
        }
        parsedOrder.time = '00:00';
      }

      const groups: GeminiDeliveryGroup[] = Array.isArray(parsedOrder.deliveryGroups)
        ? parsedOrder.deliveryGroups
        : [];

      if (groups.length === 0) {
        throw new Error('Order must contain at least one delivery group');
      }

      const { products, splitLoad } = buildOrderFromGroups(groups, destinations, productData);

      if (products.length === 0) {
        throw new Error('No products found in order');
      }

      const primaryDestination = splitLoad?.stops[0]?.destination
        ?? matchDestination(parsedOrder.destination ?? '', destinations);

      const order: Order = {
        destination: primaryDestination,
        time: parsedOrder.time,
        products,
        ...(parsedOrder.manifestNumber && { manifestNumber: parsedOrder.manifestNumber }),
        ...(parsedOrder.transportCompany && { transportCompany: parsedOrder.transportCompany }),
        ...(parsedOrder.trailerType && { trailerType: parsedOrder.trailerType }),
        ...(parsedOrder.trailerSize && { trailerSize: parsedOrder.trailerSize }),
        ...(splitLoad && { splitLoad }),
      };

      return order;
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}
