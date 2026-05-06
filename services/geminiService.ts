
import { GoogleGenAI, Type } from "@google/genai";
import type { Chat } from "@google/genai";
import type { Product, ProjectInsights, ProjectCategory, Money } from "../types.js";

export const PLATFORM_DEFAULT_CAMPID = "5339014523";

const isServer = typeof window === 'undefined';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Utility: Converts AI string price to structured Money object
 */
export const asMoney = (priceStr: string | number): Money => {
  if (typeof priceStr === 'number') return { amount: priceStr, currency: 'USD' };
  const cleaned = priceStr.replace(/[^0-9.]/g, '');
  return { amount: parseFloat(cleaned) || 0, currency: 'USD' };
};

const sessionCache = new Map<string, any>();

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error("AI Timeout")), ms))
    ]);
};

const safeParse = <T>(text: string | undefined, fallback: T): T => {
    if (!text) return fallback;
    try {
        // Try direct parse first
        const clean = text.replace(/```json|```/g, "").trim();
        return JSON.parse(clean) as T;
    } catch (e) {
        // Robust extraction for mixed content
        const match = text.match(/```json\s*([\s\S]*?)\s*```/) || 
                     text.match(/```\s*([\s\S]*?)\s*```/);
        if (match && match[1]) {
            try {
                return JSON.parse(match[1]) as T;
            } catch (e2) {}
        }
        
        const arrayMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (arrayMatch) {
            try { return JSON.parse(arrayMatch[0]) as T; } catch (e3) {}
        }

        const objectMatch = text.match(/\{\s*[\s\S]*\s*\}/);
        if (objectMatch) {
            try { return JSON.parse(objectMatch[0]) as T; } catch (e4) {}
        }

        console.error("[Vision AI] Parsing Error:", e);
        return fallback;
    }
};

const productSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      price: { type: Type.STRING },
      description: { type: Type.STRING },
      retailer: { type: Type.STRING },
      evaluation: { type: Type.STRING },
      technicalSpecs: { type: Type.STRING },
      reviewsUrl: { type: Type.STRING },
      matchType: { type: Type.STRING, enum: ['exact', 'similar', 'alternative'] },
      confidence: { type: Type.NUMBER }
    },
    required: ["name", "retailer"], // Relaxed requirements for maximum recall
  },
};

const insightSchema = {
  type: Type.OBJECT,
  properties: {
    costEstimate: {
      type: Type.OBJECT,
      properties: {
        budgetName: { type: Type.STRING },
        budgetTotal: { type: Type.STRING },
        proName: { type: Type.STRING },
        proTotal: { type: Type.STRING },
        description: { type: Type.STRING },
      },
      required: ["budgetName", "budgetTotal", "proName", "proTotal", "description"]
    },
    safetyProtocol: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          task: { type: Type.STRING },
          precaution: { type: Type.STRING },
          severity: { type: Type.STRING }
        },
        required: ["task", "precaution", "severity"]
      }
    },
    difficulty: { type: Type.STRING },
    timeEstimate: { type: Type.STRING },
    toolsRequired: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["costEstimate", "safetyProtocol", "difficulty", "timeEstimate", "toolsRequired"],
};

const routeProductDiscovery = async (p: any): Promise<Product> => {
    const uniqueId = `${p.name}_${p.retailer}`.replace(/\s+/g, '_').toLowerCase();
    const cacheKey = `p_${uniqueId}`;
    if (sessionCache.has(cacheKey)) return sessionCache.get(cacheKey);

    // Use eBay Browse API for direct merchant matches
    try {
        let ebayResults = [];
        if (isServer) {
            const { searchEbayItems } = await import(/* @vite-ignore */ "./ebayBrowseService.js");
            ebayResults = await searchEbayItems(p.name, 1);
        } else {
            const res = await fetch(`/api/ebay/search?q=${encodeURIComponent(p.name)}&limit=1`);
            if (res.ok) ebayResults = await res.json();
        }
        
        if (ebayResults && ebayResults.length > 0) {
            const ebayItem = ebayResults[0];
            const result: Product = {
                ...p,
                id: ebayItem.id,
                price: ebayItem.price,
                imageUrl: ebayItem.imageUrl,
                purchaseUrl: ebayItem.purchaseUrl,
                retailer: 'eBay',
                isAvailable: true,
                stockStatus: 'in-stock',
                isPartnerProduct: false,
                sourceType: 'verified'
            };
            sessionCache.set(cacheKey, result);
            return result;
        }
    } catch (error) {
        console.error("[eBay Discovery] Error:", error);
    }

    const result: Product = {
        ...p,
        id: uniqueId,
        price: asMoney(p.price),
        available: true,
        stockStatus: 'in-stock',
        imageUrl: `https://picsum.photos/seed/${encodeURIComponent(p.name)}/400/400`,
        purchaseUrl: p.purchaseUrl || `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(p.name)}`,
        reviewsUrl: p.reviewsUrl || `https://www.google.com/search?q=${encodeURIComponent(p.name + " reviews")}`,
        isPartnerProduct: false,
        sourceType: 'inferred'
    };
    sessionCache.set(cacheKey, result);
    return result;
}

export const generateProductsFromText = async (text: string, category?: ProjectCategory): Promise<Product[]> => {
  const apiKey = typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : null;
  
  // Follow the skill directive: Always call Gemini API from the frontend.
  // We only fallback to server if we are actually on the server already.
  if (!apiKey && !isServer) {
    console.warn("[Gemini Service] API Key missing on client, falling back to server proxy...");
    const res = await fetch('/api/ai/products/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, category })
    });
    return res.json();
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY || '' });
    const response = await withTimeout(ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Act as a Professional Consultant for the category: "${category || 'General'}". 
      The project/topic is: "${text}". 
      Identify 5-8 most essential products, tools, or gear items mentioned or required.
      PRIORITIZE RECALL: It is better to include a potential item than to miss a relevant one. Use exploratory analysis to surface specialized or professional-grade recommendations even if they aren't explicitly mentioned in the text.
      For each item, if possible, provide specific technical specs.
      Return as JSON.`,
      config: { responseMimeType: "application/json", responseSchema: productSchema },
    }), 25000); 
    const raw = safeParse(response.text, []);
    return Promise.all(raw.map((p: any) => routeProductDiscovery(p)));
  } catch (e) {
    console.error("[Vision AI] Text Analysis Error:", e);
    // If client-side fails and we aren't on server, try one last time via proxy if we haven't already
    if (!isServer && apiKey) {
        const res = await fetch('/api/ai/products/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, category })
        });
        return res.json();
    }
    return [];
  }
};

export const generateProductsFromImages = async (base64Images: string[], mimeType: string, category?: ProjectCategory): Promise<Product[]> => {
  const apiKey = typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : null;

  if (!apiKey && !isServer) {
    const res = await fetch('/api/ai/products/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: base64Images, mimeType, category })
    });
    return res.json();
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY || '' });
    const parts = base64Images.map(data => ({ inlineData: { data, mimeType } }));
    const response = await withTimeout(ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [...parts, { text: `Identify visible products or gear for a "${category || 'General'}" project. 
      PRIORITIZE RECALL: Identify ALL potentially visible tools, hardware, or materials. Do not be overly restrictive; if something looks like a specific tool, include it as an exploratory match.
      Provide technical specifications where possible. Return JSON.` }] },
      config: { responseMimeType: "application/json", responseSchema: productSchema },
    }), 30000); 
    const raw = safeParse(response.text, []);
    return Promise.all(raw.map((p: any) => routeProductDiscovery(p)));
  } catch (e) {
    console.error("[Vision AI] Image Analysis Error:", e);
    if (!isServer && apiKey) {
        const res = await fetch('/api/ai/products/images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ images: base64Images, mimeType, category })
        });
        return res.json();
    }
    return [];
  }
};

export const generateProductsFromUrl = async (url: string, category?: ProjectCategory): Promise<Product[]> => {
  const apiKey = typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : null;

  if (!apiKey && !isServer) {
    const res = await fetch('/api/ai/products/url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, category })
    });
    return res.json();
  }

  console.log(`[Vision AI] Starting URL Analysis for: ${url} (Category: ${category})`);
  try {
    const ai = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY || '' });
    
    const response = await withTimeout(ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this tutorial/page: ${url}. 
      The user has categorized this as: "${category || 'General'}".
      Identify ALL primary products, gear items, or materials discussed. 
      PRIORITIZE RECALL: It is better to have a generic or approximate match than to miss an item mentioned in the content. Surfaces 5-8 recommendations.
      Return as JSON with technical specs.`,
      config: { 
        tools: [{ urlContext: {} }],
        responseMimeType: "application/json",
        responseSchema: productSchema
      }
    }), 35000); 
    
    const raw = safeParse(response.text, []);
    if (raw.length > 0) {
        console.log(`[Vision AI] URL Analysis successful via urlContext`);
        return Promise.all(raw.map((p: any) => routeProductDiscovery(p)));
    }

    console.log(`[Vision AI] urlContext empty, falling back to text analysis...`);
    return generateProductsFromText(url, category);
  } catch (e) {
    console.warn("[Vision AI] URL Analysis Error on client, trying server proxy backup...");
    if (!isServer) {
        const res = await fetch('/api/ai/products/url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, category })
        });
        if (res.ok) return res.json();
    }
    return generateProductsFromText(url, category);
  }
};

export const generateComplementaryProducts = async (title: string, existing: Product[], category?: ProjectCategory): Promise<Product[]> => {
  if (!isServer) {
    const res = await fetch('/api/ai/products/complementary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, existing, category })
    });
    return res.json();
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await withTimeout(ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `For "${title}", identify 2 essential accessories with technical data.`,
      config: { responseMimeType: "application/json", responseSchema: productSchema },
    }), 15000); // 15s timeout
    const raw = safeParse(response.text, []);
    return Promise.all(raw.map((p: any) => routeProductDiscovery(p)));
  } catch (e) {
    return [];
  }
};

export const generateV3ProjectInsights = async (title: string, products: Product[], category?: ProjectCategory): Promise<ProjectInsights> => {
  if (!isServer) {
    const res = await fetch('/api/ai/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, products, category })
    });
    return res.json();
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await withTimeout(ai.models.generateContent({
      model: 'gemini-3.1-pro-preview', // Upgraded to Pro for better reasoning on safety and costs
      contents: `Audit: "${title}". Materials: ${products.map(p => p.name).join(', ')}.`,
      config: { responseMimeType: "application/json", responseSchema: insightSchema },
    }), 25000); // Increased timeout for Pro model
    return safeParse(response.text, {} as ProjectInsights);
  } catch (e) {
    return {} as ProjectInsights;
  }
};

export const createProjectAssistantChat = (videoTitle: string, products: Product[], category?: ProjectCategory): Chat => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return ai.chats.create({
    model: 'gemini-3.1-pro-preview', // Upgraded to Pro for expert-level advice
    config: {
      systemInstruction: `Watch1Do1 Assistant for "${videoTitle}". Available Kit: ${products.map(p => p.name).join(', ')}.`,
      tools: [{ googleSearch: {} }]
    }
  });
};

export const searchSpecificProduct = async (query: string): Promise<Product[]> => {
  if (!isServer) {
    const res = await fetch('/api/ai/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    return res.json();
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Perform multi-retailer search for: "${query}". Provide 3 distinct options. 
      You MUST provide detailed technical specifications and verified review links for each. 
      Return JSON.`,
      config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: productSchema },
    });
    const raw = safeParse(response.text, []);
    return Promise.all(raw.map((p: any) => routeProductDiscovery(p)));
  } catch (e) {
    return [];
  }
};

export const revalidateProductAvailability = async (product: Product): Promise<Partial<Product>> => {
  if (!isServer) {
    const res = await fetch('/api/ai/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product })
    });
    return res.json();
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Price/availability for: "${product.name}".`,
      config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", 
        responseSchema: {
          type: Type.OBJECT,
          properties: { 
              price: { type: Type.STRING }, 
              evaluation: { type: Type.STRING },
              available: { type: Type.BOOLEAN },
              stockStatus: { type: Type.STRING }
          },
          required: ["price", "evaluation", "available", "stockStatus"]
        }
      },
    });
    const parsed = safeParse(response.text, {} as any);
    if (parsed.price) parsed.price = asMoney(parsed.price);
    return parsed;
  } catch (e) {
    return {};
  }
};

/**
 * Phase 2: Deep Dive Enrichment
 * Identifies advanced, specialized, or professional-grade items.
 */
export const generateDeepDiveProducts = async (videoTitle: string, existing: Product[], category?: ProjectCategory): Promise<Product[]> => {
    if (!isServer) {
        const res = await fetch('/api/ai/products/deepdive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: videoTitle, existing, category })
        });
        return res.json();
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const existingNames = existing.map(p => p.name).join(", ");
        const response = await withTimeout(ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `The project is "${videoTitle}" in the category "${category || 'General'}".
            Existing items already found: [${existingNames}].
            Perform a "DEEP DIVE" to identify 3-5 ADVANCED, SPECIALIZED, or PROFESSIONAL-LEVEL tools or hardware that would enhance this project or are often missed by beginners.
            Return as JSON.`,
            config: { responseMimeType: "application/json", responseSchema: productSchema },
        }), 35000);
        const raw = safeParse(response.text, []);
        return Promise.all(raw.map((p: any) => routeProductDiscovery(p)));
    } catch (e) {
        console.error("[Vision AI] Deep Dive Error:", e);
        return [];
    }
}
