
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
let cachedEbayApiDenied = false;

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

    // If this is a specific URL Import or Custom Curation, preserve original details and skip discovery
    if (p.isUrlImport || p.sourceType === 'manual') {
        const result: Product = {
            ...p,
            id: uniqueId,
            price: asMoney(p.price),
            available: true,
            stockStatus: 'in-stock',
            imageUrl: p.imageUrl || `https://picsum.photos/seed/${encodeURIComponent(p.name)}/400/400`,
            purchaseUrl: p.purchaseUrl,
            reviewsUrl: p.reviewsUrl || `https://www.google.com/search?q=${encodeURIComponent(p.name + " reviews")}`,
            isPartnerProduct: false,
            sourceType: 'manual',
            isCreatorDeclared: true
        };
        sessionCache.set(cacheKey, result);
        return result;
    }

    // Use eBay Browse API for direct merchant matches
    try {
        let ebayResults = [];
        if (isServer) {
            const { searchEbayItems } = await import("./ebayBrowseService.js");
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

class ServerProxyChat {
  private history: { role: 'user' | 'model'; text: string }[] = [];
  private videoTitle: string;
  private products: Product[];
  private category?: ProjectCategory;

  constructor(videoTitle: string, products: Product[], category?: ProjectCategory) {
    this.videoTitle = videoTitle;
    this.products = products;
    this.category = category;
  }

  async *sendMessageStream({ message }: { message: string }) {
    this.history.push({ role: 'user', text: message });

    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoTitle: this.videoTitle,
        products: this.products,
        category: this.category,
        message: message,
        history: this.history.slice(0, -1)
      })
    });

    if (!response.ok) {
      throw new Error(`Chat failed with status ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body reader or stream interface supported");

    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedModelText = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const chunk = JSON.parse(jsonStr);
            accumulatedModelText += chunk.text || '';
            yield chunk;
          } catch (e) {
            console.error("Failed to parse chat chunk:", e);
          }
        }
      }
    }

    this.history.push({ role: 'model', text: accumulatedModelText });
  }
}

export const generateProductsFromText = async (text: string, category?: ProjectCategory): Promise<Product[]> => {
  if (!isServer) {
    const res = await fetch('/api/ai/products/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, category })
    });
    return res.json();
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await withTimeout(ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `You are a specialist in ${category || 'General'} projects only.

STRICT CATEGORY RULES:
- ONLY return tools, materials, and products that belong to the declared category: "${category || 'General'}".
- If the video/page content does NOT match the declared category, or contains no relevant physical tools/materials, return an empty array [] immediately.
- Do NOT guess or pull tools from other trades (e.g. no drywall tools for plumbing, no woodworking for electrical, etc.).

Video/Project: "${text}"
Category: "${category || 'General'}"

Act as a Professional Consultant for the category: "${category || 'General'}". 
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
    return [];
  }
};

export const generateProductsFromImages = async (base64Images: string[], mimeType: string, category?: ProjectCategory): Promise<Product[]> => {
  if (!isServer) {
    const res = await fetch('/api/ai/products/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: base64Images, mimeType, category })
    });
    return res.json();
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const parts = base64Images.map(data => ({ inlineData: { data, mimeType } }));
    const response = await withTimeout(ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: { parts: [...parts, { text: `You are a specialist in ${category || 'General'} projects only.

STRICT CATEGORY RULES:
- ONLY return tools, materials, and products that belong to the declared category: "${category || 'General'}".
- If the video/page content does NOT match the declared category, or contains no relevant physical tools/materials, return an empty array [] immediately.
- Do NOT guess or pull tools from other trades (e.g. no drywall tools for plumbing, no woodworking for electrical, etc.).

Identify visible products or gear for a "${category || 'General'}" project. 
PRIORITIZE RECALL: Identify ALL potentially visible tools, hardware, or materials. Do not be overly restrictive; if something looks like a specific tool, include it as an exploratory match.
Provide technical specifications where possible. Return JSON.` }] },
      config: { responseMimeType: "application/json", responseSchema: productSchema },
    }), 30000); 
    const raw = safeParse(response.text, []);
    return Promise.all(raw.map((p: any) => routeProductDiscovery(p)));
  } catch (e) {
    console.error("[Vision AI] Image Analysis Error:", e);
    return [];
  }
};

export interface CrawledPageData {
  contentText: string;
  title: string;
  description: string;
  ogImage: string;
  priceAmount: string;
}

export function extractPriceFromHtml(html: string): string {
  // First clean common HTML entities to make regex matching extremely stable on escaping environments like search XML feeds
  const cleanHtml = html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#36;/g, '$')
    .replace(/&#x24;/g, '$')
    .replace(/&pound;/g, '£')
    .replace(/&#163;/g, '£')
    .replace(/&euro;/g, '€')
    .replace(/&#8364;/g, '€')
    .replace(/&#x20ac;/g, '€')
    .replace(/&#165;/g, '¥');

  // 1. High-Priority specific Meta Tags
  const metaRegexes = [
    /<meta[^>]+(?:property|name)=['"]product:price:amount['"][^>]+content=['"]([^'"]+)['"]/gi,
    /<meta[^>]+content=['"]([^'"]+)['"][^>]+(?:property|name)=['"]product:price:amount['"]/gi,
    /<meta[^>]+(?:property|name)=['"]price:amount['"][^>]+content=['"]([^'"]+)['"]/gi,
    /<meta[^>]+content=['"]([^'"]+)['"][^>]+(?:property|name)=['"]price:amount['"]/gi,
    /<meta[^>]+(?:property|name)=['"]price['"][^>]+content=['"]([^'"]+)['"]/gi,
    /<meta[^>]+content=['"]([^'"]+)['"][^>]+(?:property|name)=['"]price['"]/gi,
  ];
  for (const regex of metaRegexes) {
    let match;
    while ((match = regex.exec(cleanHtml)) !== null) {
      const cleaned = match[1].replace(/[^0-9.]/g, '').trim();
      const val = parseFloat(cleaned);
      if (val > 0.05) {
        return val.toFixed(2);
      }
    }
  }

  // 2. Specific Retailer/eBay primary selectors (handling $, £, €, C$, AU$, GBP, EUR currencies)
  const retailerRegexes = [
    /class=['"]x-price-primary['"][\s\S]*?(?:[\$\xA3\u20AC\u00A3\u20AC\xA5]|GBP|EUR|CAD|AUD|C\s*\$|AU\s*\$|US\s*\$)\s*([0-9,.]+)/gi,
    /id=['"]prcIsum['"][| |^>]*>\s*(?:US\s*|GBP\s*|EUR\s*|C\s*|AU\s*)?(?:[\$\xA3\u20AC\u00A3\u20AC\xA5])?\s*([0-9,.]+)/gi,
    /class=['"][^'"]*binPrice[^'"]*['"][^>]*>\s*(?:US\s*|GBP\s*|EUR\s*|C\s*|AU\s*)?(?:[\$\xA3\u20AC\u00A3\u20AC\xA5])?\s*([0-9,.]+)/gi,
    /class=['"]ux-textspans['"][^>]*>\s*(?:US\s*|GBP\s*|EUR\s*|C\s*|AU\s*)?(?:[\$\xA3\u20AC\u00A3\u20AC\xA5])?\s*([0-9,.]+)/gi,
  ];
  for (const r of retailerRegexes) {
    let match;
    while ((match = r.exec(cleanHtml)) !== null) {
      const cleaned = match[1].replace(/,/g, '').trim();
      const val = parseFloat(cleaned);
      if (val > 0.05) {
        return val.toFixed(2);
      }
    }
  }

  // 3. Try JSON-LD schema price
  const jsonLdMatches = [
    /["']price["']\s*:\s*["']([0-9.,]+)["']/gi,
    /["']price["']\s*:\s*([0-9.,]+)/gi,
    /["']priceAmount["']\s*:\s*["']([0-9.,]+)["']/gi,
    /["']priceAmount["']\s*:\s*([0-9.,]+)/gi,
  ];
  for (const regex of jsonLdMatches) {
    let match;
    while ((match = regex.exec(cleanHtml)) !== null) {
      const cleaned = match[1].replace(/,/g, '').trim();
      const val = parseFloat(cleaned);
      if (val > 0.05) {
        return val.toFixed(2);
      }
    }
  }

  // 4. Itemprop="price" element selectors
  const itempropRegexes = [
    /itemprop=['"]price['"][^>]+content=['"]([^'"]+)['"]/gi,
    /content=['"]([^'"]+)['"][^>]+itemprop=['"]price['"]/gi,
    /<[^>]*itemprop=['"]price['"][^>]*>\s*(?:US\s*|GBP\s*|EUR\s*|C\s*|AU\s*)?(?:[\$\xA3\u20AC\u00A3\u20AC\xA5])?\s*([0-9,.]+)/gi,
  ];
  for (const r of itempropRegexes) {
    let match;
    while ((match = r.exec(cleanHtml)) !== null) {
      const cleaned = match[1].replace(/,/g, '').trim();
      const val = parseFloat(cleaned);
      if (val > 0.05) {
        return val.toFixed(2);
      }
    }
  }

  // 5. Broader fallback: match values over some reasonable threshold and definitely skip 0.00
  // Supports both decimal and integer amounts across various currencies
  const genericPriceRegex = /(?:[\$\xA3\u20AC\u00A3\u20AC\xA5]|GBP|EUR|CAD|AUD|C\s*\$|AU\s*\$|US\s*\$)\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+\.[0-9]{2}|[0-9,]+)/gi;
  let match;
  while ((match = genericPriceRegex.exec(cleanHtml)) !== null) {
    const cleaned = match[1].replace(/,/g, '').trim();
    const val = parseFloat(cleaned);
    if (val > 0.10) {
      return val.toFixed(2);
    }
  }

  return '';
}

export const fetchAndExtractPageContent = async (url: string): Promise<CrawledPageData> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12-second socket limit
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP status ${response.status}`);
    }
    
    const html = await response.text();
    
    // Extract head title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    let title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : '';
    title = title
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    // Extract og:description or standard meta descriptions (support both attribute positions)
    const descMatch = html.match(/<meta[^>]+(?:property|name)="[^"]*description"[^>]+content="([^"]+)"/i) ||
                      html.match(/<meta[^>]+content="([^"]+)"[^>]+(?:property|name)="[^"]*description"/i);
    let description = descMatch ? descMatch[1].trim() : '';
    description = description
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Extract og:image or standard schema image (support both attribute positions)
    const imageMatch = html.match(/<meta[^>]+(?:property|name)="[^"]*image"[^>]+content="([^"]+)"/i) ||
                       html.match(/<meta[^>]+content="([^"]+)"[^>]+(?:property|name)="[^"]*image"/i) ||
                       html.match(/<meta[^>]+(?:property|name)="og:image"[^>]+content="([^"]+)"/i) ||
                       html.match(/<meta[^>]+content="([^"]+)"[^>]+(?:property|name)="og:image"/i);
    const ogImage = imageMatch ? imageMatch[1].trim() : '';

    // Extract price using our robust non-zero selective scanner
    const priceAmount = extractPriceFromHtml(html);

    // Try finding main eBay/retailer listing image if ogImage is empty
    let finalOgImage = ogImage;
    if (!finalOgImage) {
      const rawImgMatch = html.match(/<img[^>]+id="icImg"[^>]+src="([^"]+)"/i) ||
                           html.match(/id="mainImgHldr"[\s\S]*?src="([^"]+)"/i) ||
                           html.match(/class="ux-image-filmstrip-carousel"[\s\S]*?src="([^"]+)"/i);
      if (rawImgMatch && rawImgMatch[1]) {
        finalOgImage = rawImgMatch[1].trim();
      }
    }

    // Strip scripts, styles, and format readable text for LLM context inclusion
    let cleanText = html
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
      .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const formattedContentText = `
URL submitted: ${url}
HTML Title: ${title}
Meta Thumbnail: ${finalOgImage}
Meta Description: ${description}
Meta Price Amount: ${priceAmount}
Dense Body Snippet: ${cleanText.substring(0, 15000)}
    `.trim();

    return {
      contentText: formattedContentText,
      title,
      description,
      ogImage: finalOgImage,
      priceAmount
    };
  } catch (error: any) {
    console.warn(`[Web Crawler] Scraper fetch warning for "${url}": ${error.message}`);
    return {
      contentText: `URL submitted: ${url}`,
      title: '',
      description: '',
      ogImage: '',
      priceAmount: ''
    };
  }
};

/**
 * Super-powered unauthenticated offline fallback parser for eBay listings.
 * Scours eBay oEmbed API for titles/images, and the cached search XML RSS feed for prices.
 */
async function fetchEbayItemOffline(itemId: string) {
  let title = '';
  let priceAmount = '';
  let ogImage = '';
  let description = '';
  let rawXml = '';

  // 0. Primary check: Attempt to crawl the direct listing page directly (very high fidelity)
  try {
    const directUrl = `https://www.ebay.com/itm/${itemId}`;
    const directRes = await fetch(directUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    if (directRes.ok) {
      const htmlText = await directRes.text();
      // Extract title
      const titleMatch = htmlText.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].replace(/\s*\|\s*eBay/gi, '').replace(/\s+/g, ' ').trim();
      }
      
      // Extract price using our versatile mult-currency scanner
      priceAmount = extractPriceFromHtml(htmlText);
      
      // Extract ogImage
      const imageMatch = htmlText.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i) ||
                         htmlText.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      if (imageMatch && imageMatch[1]) {
        ogImage = imageMatch[1].trim();
      }
      
      // Extract description
      const descMatch = htmlText.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']description["']/i) ||
                        htmlText.match(/<meta[^>]+(?:property|name)=["']description["'][^>]+content=["']([^"']+)["']/i);
      if (descMatch && descMatch[1]) {
        description = descMatch[1].trim();
      }
    }
  } catch (err: any) {
    console.warn(`[eBay Offline Fallback] Direct page crawl failed or was blocked:`, err.message);
  }

  // 1. Try eBay oEmbed if we didn't get general details from direct page
  if (!title || !ogImage) {
    try {
      const oEmbedUrl = `https://www.ebay.com/services/oembed?url=https%3A%2F%2Fwww.ebay.com%2Fitm%2F${itemId}&format=json`;
      const oRes = await fetch(oEmbedUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      if (oRes.ok) {
        const oData = await oRes.json() as any;
        if (oData) {
          title = title || oData.title || '';
          ogImage = ogImage || oData.thumbnail_url || '';
          description = description || `Active eBay listing for: ${title}. Sourced via unauthenticated oEmbed fallback.`;
        }
      }
    } catch (err: any) {
      console.warn(`[eBay Offline Fallback] oEmbed query failed:`, err.message);
    }
  }

  // 2. Try eBay search index RSS feed if price/xml still needed
  if (!priceAmount) {
    try {
      const rssUrl = `https://www.ebay.com/sch/i.html?_nkw=${itemId}&_rss=1`;
      const rssRes = await fetch(rssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'Accept': 'text/xml,application/xml,application/xhtml+xml,text/html;q=0.9',
          'Accept-Language': 'en-US,en;q=0.5'
        }
      });

      if (rssRes.ok) {
        rawXml = await rssRes.text();
      }
    } catch (err: any) {
      console.warn(`[eBay Offline Fallback] RSS lookup failed:`, err.message);
    }

    let itemMatch = rawXml.match(/<item>([\s\S]*?)<\/item>/i);

    // If no items in the feed, try searching by title (which is highly specific and returns matches)
    if (!itemMatch && title) {
      try {
        const searchTitleUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(title)}&_rss=1`;
        console.log(`[eBay Offline Fallback] No items found for ID search. Retrying RSS search by exact oEmbed title: "${title}"`);
        const rssRes = await fetch(searchTitleUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
            'Accept': 'text/xml,application/xml,application/xhtml+xml,text/html;q=0.9',
            'Accept-Language': 'en-US,en;q=0.5'
          }
        });
        if (rssRes.ok) {
          rawXml = await rssRes.text();
          itemMatch = rawXml.match(/<item>([\s\S]*?)<\/item>/i);
        }
      } catch (err: any) {
        console.warn(`[eBay Offline Fallback] RSS Title search failed:`, err.message);
      }
    }

    if (itemMatch && itemMatch[1]) {
      const itemXml = itemMatch[1];
      
      if (!title) {
        const tMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
        if (tMatch && tMatch[1]) {
          title = tMatch[1].replace(/\s*\|\s*eBay/gi, '').replace(/\s+/g, ' ').trim();
        }
      }
      
      if (!ogImage) {
        const imgMatch = itemXml.match(/<img[^>]+src="([^"]+)"/i) || itemXml.match(/<media:thumbnail[^>]+url="([^"]+)"/i);
        if (imgMatch && imgMatch[1]) {
          ogImage = imgMatch[1].trim();
        }
      }

      // Search description for price patterns (e.g., <b>$1.99</b>, Price: $1.99, etc.) using our precise scanner
      priceAmount = extractPriceFromHtml(itemXml);
    }
  }

  // Clean HTML entities if present
  if (title) {
    title = title
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  return {
    title,
    priceAmount,
    ogImage,
    description: description || (title ? `Active eBay listing for "${title}".` : ''),
    rawXml
  };
}

const fallbackConstructEbayAffiliateUrl = (itemId: string): string => {
  const campid = process.env.EBAY_CAMPAIGN_ID || PLATFORM_DEFAULT_CAMPID || "5339014523";
  const toolid = "10001";
  const mkrid = "711-53200-19255-0";
  const customid = "w1d1_hub_sync";
  return `https://www.ebay.com/itm/${itemId}?mkrid=${mkrid}&siteid=0&campid=${campid}&toolid=${toolid}&customid=${customid}`;
};

export const generateProductsFromUrl = async (url: string, category?: ProjectCategory): Promise<Product[]> => {
  if (!isServer) {
    const res = await fetch('/api/ai/products/url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, category })
    });
    return res.json();
  }

  // Auto-detect eBay listings and fetch directly from eBay Browse API
  const ebayMatch = url.match(/\/itm\/(?:[^\/]+\/)?([0-9]+)/i);
  let offlineData: any = null;

  if (ebayMatch && ebayMatch[1]) {
    const itemId = ebayMatch[1];
    console.log(`[eBay Auto-Discovery] Detected eBay listing item URL. Extracting details via eBay Browse API for itemId: ${itemId}`);
    if (cachedEbayApiDenied) {
      console.log(`[eBay Auto-Discovery] Bypassing eBay Browse API due to cached Access Denied / Insufficient Permissions.`);
    } else {
      try {
        const { getEbayItem, searchEbayItems, constructEbayAffiliateUrl } = await import("./ebayBrowseService.js");

        let ebayData: any = null;
        let usedSearchFallback = false;

        // 1. Try direct Item Browse API
        try {
          ebayData = await getEbayItem(itemId);
        } catch (directErr: any) {
          console.log(`[eBay Auto-Discovery] Direct getEbayItem bypassed for ${itemId} (using Search and offline fallback routing).`);
          if (directErr.message.includes('Access denied') || directErr.message.includes('1100') || directErr.message.includes('permission')) {
            console.log(`[eBay Auto-Discovery] Insufficient permissions detected. Caching Browse API denial status.`);
            cachedEbayApiDenied = true;
          }
          // 2. Fallback: search for the itemId to get listing summary
          if (!cachedEbayApiDenied) {
            try {
              const searchData = await searchEbayItems(itemId, 1);
              if (searchData && searchData.length > 0) {
                ebayData = searchData[0];
                usedSearchFallback = true;
              }
            } catch (searchErr: any) {
              console.log(`[eBay Auto-Discovery] Search API fallback bypassed for ${itemId}.`);
              if (searchErr.message.includes('Access denied') || searchErr.message.includes('1100') || searchErr.message.includes('permission')) {
                cachedEbayApiDenied = true;
              }
            }
          }
        }

        if (ebayData) {
          let priceVal = 0;
          let currencyVal = 'USD';
          let imageUrlVal = `https://picsum.photos/seed/ebay_${itemId}/400/400`;
          let titleVal = ebayData.title || 'eBay Sourced Product';
          let descVal = ebayData.description || ebayData.shortDescription || `Special curated eBay item (${titleVal}) listed on eBay marketplace.`;

          if (usedSearchFallback) {
            // Structure returned by item_summary/search is slightly different
            priceVal = parseFloat(ebayData.price?.value || "0");
            currencyVal = ebayData.price?.currency || "USD";
            imageUrlVal = ebayData.image?.imageUrl || imageUrlVal;
            descVal = `Live eBay item listing for "${titleVal}" (ID: ${itemId}).`;
          } else {
            // Structure returned by item/itemId
            priceVal = parseFloat(ebayData.price?.value || "0");
            currencyVal = ebayData.price?.currency || "USD";
            imageUrlVal = ebayData.image?.imageUrl || imageUrlVal;
          }

          const affiliateUrl = constructEbayAffiliateUrl ? constructEbayAffiliateUrl(itemId) : fallbackConstructEbayAffiliateUrl(itemId);
          
          const parsedEbayItem: Product = {
            id: `ebay-${itemId}`,
            name: titleVal,
            price: { amount: priceVal, currency: currencyVal },
            description: descVal,
            retailer: 'eBay',
            evaluation: `Directly synchronized with live eBay listing catalog.${usedSearchFallback ? ' (Search-matching verified)' : ''}`,
            imageUrl: imageUrlVal,
            purchaseUrl: affiliateUrl,
            isPartnerProduct: true,
            isCreatorDeclared: true,
            sourceType: 'manual'
          };
          
          console.log(`[eBay Auto-Discovery] Successfully imported eBay item: ${parsedEbayItem.name} at price: ${priceVal}`);
          return [parsedEbayItem];
        }
      } catch (ebayErr: any) {
        console.log(`[eBay Auto-Discovery] API query / token bypassed for itemId ${itemId}, routing to offline backup parser.`);
        if (ebayErr.message.includes('Access denied') || ebayErr.message.includes('1100') || ebayErr.message.includes('permission')) {
          cachedEbayApiDenied = true;
        }
      }
    }

    // 3. Robust super-powered unauthenticated offline fallback (RSS + oEmbed) if API or credentials failed
    try {
      console.log(`[eBay Auto-Discovery] Invoking offline RSS + oEmbed scraper fallback for itemId: ${itemId}`);
      offlineData = await fetchEbayItemOffline(itemId);
      if (offlineData && offlineData.title) {
        const priceVal = parseFloat(offlineData.priceAmount || "0");
        const affiliateUrl = fallbackConstructEbayAffiliateUrl(itemId);
        
        if (priceVal > 0) {
          const parsedEbayItem: Product = {
            id: `ebay-${itemId}`,
            name: offlineData.title,
            price: { amount: priceVal, currency: 'USD' },
            description: offlineData.description || `Special curated eBay item (${offlineData.title}) listed on eBay marketplace.`,
            retailer: 'eBay',
            evaluation: `Offline Sourced: Seamless product matching via unauthenticated oEmbed & RSS index catalogs. No credentials required, affiliate link established.`,
            imageUrl: offlineData.ogImage || `https://picsum.photos/seed/ebay_${itemId}/400/400`,
            purchaseUrl: affiliateUrl,
            isPartnerProduct: true,
            isCreatorDeclared: true,
            sourceType: 'manual'
          };
          
          console.log(`[eBay Auto-Discovery] Successfully compiled eBay item from offline index backup: ${parsedEbayItem.name} at price: ${priceVal}`);
          return [parsedEbayItem];
        } else {
          console.log(`[eBay Auto-Discovery] Sourced details for eBay item "${offlineData.title}" via fallback oEmbed but price was empty/zero. Dropping down to unblocked virtual crawl parsing via Gemini API...`);
        }
      }
    } catch (offlineErr: any) {
      console.log(`[eBay Auto-Discovery] Offline fallback routed for itemId ${itemId}.`);
    }
  }

  console.log(`[Vision AI] Initiating scraping and RAG text extraction for: ${url}`);
  
  let crawledResult: CrawledPageData | null = null;
  try {
    if (ebayMatch && offlineData) {
      console.log(`[eBay Auto-Discovery] Feeding oEmbed metadata & raw RSS XML search feed down to Gemini's reasoning engine to bypass anti-scraping blocks.`);
      crawledResult = {
        contentText: `
URL submitted: ${url}
eBay Item ID: ${ebayMatch[1]}
Listing Title: ${offlineData.title}
Meta Thumbnail: ${offlineData.ogImage}
Meta Description: ${offlineData.description}
Raw XML RSS Feed Snippet:
${offlineData.rawXml || ''}
        `.trim(),
        title: offlineData.title,
        description: offlineData.description,
        ogImage: offlineData.ogImage,
        priceAmount: offlineData.priceAmount || ''
      };
    } else {
      crawledResult = await fetchAndExtractPageContent(url);
    }
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const response = await withTimeout(ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `You are an expert product details extractor and web semantic parsing model.
The user wants to import a product from this web page link:
"${url}"

Here is the extracted text and metadata we crawled:
### CRAWLED WEBPAGE CONTENT ###
${crawledResult.contentText}
### END CRAWLED WEBPAGE CONTENT ###

Task:
Your task is to analyze the crawled content and reconstruct the single product details described on that webpage.
Return exactly 1 item in the array.
Extract:
1. name: The precise, human-friendly product name (e.g., "Rogue RD80PK Dreadnought Acoustic Guitar Pack"). Clean up any trailing query strings or SEO junk, but keep the exact brand and model.
2. price: The exact numerical price (e.g., 120.00 or "120.00"). Prefer the Meta Price Amount if present or extract it from the page title/snippet.
3. retailer: The name of the store (e.g., "Guitar Center", "Amazon", "Shopify", or the domain of the site).
4. description: A clear 1-sentence showcase description.
5. evaluation: A list of 3-4 bullet specifications or reasons to buy.
6. technicalSpecs: Key technical attributes of the product.

Ensure to output a valid JSON array matching the productSchema. No markdown outside the JSON block.`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: productSchema
      }
    }), 30000); 
    
    const raw = safeParse(response.text, []);
    if (raw && raw.length > 0) {
        // Force the crawled URL and designated flags to preserve custom metadata from being overwritten by general listings
        const annotated = raw.map((item: any) => {
            const domainMatch = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i);
            const domain = domainMatch ? domainMatch[1] : 'External Retailer';
            const cleanDomain = domain.replace(/\.[a-z]{2,6}$/i, '').split('.').pop() || 'Retailer';
            const cleanRetailer = cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1);

            return {
                ...item,
                purchaseUrl: url,
                retailer: item.retailer || cleanRetailer,
                isUrlImport: true,
                sourceType: 'manual',
                isCreatorDeclared: true
            };
        });
        
        console.log(`[Vision AI] Successfully crawled and modeled product: ${annotated[0].name}`);
        return Promise.all(annotated.map((p: any) => routeProductDiscovery(p)));
    }

    throw new Error("Zero structured products returned from crawler response parsing.");
  } catch (e: any) {
    console.log("[Vision AI] Crawler fallback mode active: semantic path reconstruction in progress.");
    
    // Fallback URL Path Parsing Algorithm inside express server
    try {
      // If we don't have crawler results yet, let's try crawling quickly
      if (!crawledResult) {
        crawledResult = await fetchAndExtractPageContent(url).catch(() => null);
      }

      // Try unauthenticated eBay oEmbed API as a super-powered fallback for titles and images if crawl gets blocked
      if (url.includes('ebay.com')) {
        try {
          const oEmbedUrl = `https://www.ebay.com/services/oembed?url=${encodeURIComponent(url)}&format=json`;
          const oRes = await fetch(oEmbedUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
          });
          if (oRes.ok) {
            const oData = await oRes.json() as any;
            if (oData && oData.title) {
              if (!crawledResult) {
                crawledResult = {
                  contentText: `oEmbed fetched: ${oData.title}`,
                  title: oData.title,
                  description: oData.title,
                  ogImage: oData.thumbnail_url || '',
                  priceAmount: ''
                };
              } else {
                if (!crawledResult.title) crawledResult.title = oData.title;
                if (!crawledResult.ogImage) crawledResult.ogImage = oData.thumbnail_url || '';
              }
            }
          }
        } catch (oErr) {
          console.warn("[eBay oEmbed Fallback] Failed:", oErr);
        }
      }

      const domainMatch = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i);
      const domain = domainMatch ? domainMatch[1] : 'External Retailer';
      const cleanDomain = domain.replace(/\.[a-z]{2,6}$/i, '').split('.').pop() || 'Retailer';
      const cleanRetailer = cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1);

      // Use page title if present, otherwise parse the path
      let name = '';
      if (crawledResult && crawledResult.title) {
        name = crawledResult.title;
        // Clean up titles (e.g. Rogue RD80PK Dreadnought Acoustic Guitar Pack | Guitar Center -> Rogue RD80PK Dreadnought Acoustic Guitar Pack)
        name = name.split(/\s*\|\s*|\s*-\s*|\s*—\s*/)[0].trim();
      }

      const isNumeric = (str: string) => /^\d+$/.test(str.replace(/\s/g, ''));
      if (!name || name.length < 5 || isNumeric(name) || name === 'URL submitted' || name.toLowerCase().includes('robot') || name.toLowerCase().includes('captcha')) {
        // Try extracting search keywords or item description from the URL query
        try {
          const parsedUrl = new URL(url);
          const skw = parsedUrl.searchParams.get('_skw') || parsedUrl.searchParams.get('_nkw') || parsedUrl.searchParams.get('q') || parsedUrl.searchParams.get('query');
          if (skw) {
            const rawSkw = decodeURIComponent(skw).replace(/[+-]/g, ' ').trim();
            if (rawSkw && rawSkw.length > 2) {
              name = rawSkw.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
            }
          }
        } catch (e) {
          console.error("URL parsing error during fallback:", e);
        }
      }

      if (!name || name.length < 3 || isNumeric(name)) {
        const urlParts = url.split('/');
        let lastPart = urlParts[urlParts.length - 1] || '';
        if (lastPart.includes('?') || lastPart.includes('&') || lastPart.includes('#')) {
          lastPart = lastPart.split(/[?&#]/)[0];
        }
        
        name = lastPart
          .replace(/[-_]/g, ' ')
          .replace(/\d+gc|gc|\d+dp|dp/gi, '') // Strip common retailer ID tags
          .replace(/\.[a-z]{2,4}$/i, '')     // Clean file extension
          .trim();
        
        if (!name || name.length < 3 || isNumeric(name)) {
          let prevPart = urlParts[urlParts.length - 2] || '';
          name = prevPart.replace(/[-_]/g, ' ').trim();
        }

        if (!name || name.length < 3 || isNumeric(name)) {
          // If it's still numeric (like eBay itemId), make it descriptive
          if (isNumeric(lastPart)) {
            name = `eBay Item ${lastPart}`;
          } else {
            name = 'Custom Sourced Product';
          }
        }

        // Format words elegantly
        name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }

      const rawPrice = crawledResult?.priceAmount || '';
      const parsedPriceNum = parseFloat(rawPrice);
      const finalPrice = parsedPriceNum > 0 ? { amount: parsedPriceNum, currency: 'USD' } : { amount: 0, currency: 'USD' };

      const finalDescription = crawledResult?.description 
        ? crawledResult.description 
        : `Custom curated product from ${cleanRetailer}. Open checkout link to view.`;

      const finalImage = (crawledResult?.ogImage && crawledResult.ogImage.startsWith('http'))
        ? crawledResult.ogImage
        : `https://picsum.photos/seed/${encodeURIComponent(name)}/400/400`;

      const fallbackItem: Product = {
        id: `url_fallback_${Date.now()}`,
        name: name,
        price: finalPrice,
        description: finalDescription,
        retailer: cleanRetailer,
        evaluation: `Spliced directly from active product link.`,
        imageUrl: finalImage,
        purchaseUrl: url,
        isPartnerProduct: false,
        isCreatorDeclared: true,
        sourceType: 'manual'
      };
      
      return [fallbackItem];
    } catch (fallbackErr: any) {
      console.error("[Vision AI] Hard failure on fallback parser:", fallbackErr);
      return [];
    }
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
      model: 'gemini-3.5-flash',
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
      contents: `You are an expert project inspector/auditor.
You are a specialist in "${category || 'General'}" projects only. Keep all safety, difficulty, and cost evaluations focused STRICTLY within "${category || 'General'}". Do NOT reference unrelated disciplines, materials or other trades.

Audit: "${title}". Materials: ${products.map(p => p.name).join(', ')}.`,
      config: { responseMimeType: "application/json", responseSchema: insightSchema },
    }), 25000); // Increased timeout for Pro model
    return safeParse(response.text, {} as ProjectInsights);
  } catch (e) {
    return {} as ProjectInsights;
  }
};

export const createProjectAssistantChat = (videoTitle: string, products: Product[], category?: ProjectCategory): any => {
  if (!isServer) {
    return new ServerProxyChat(videoTitle, products, category);
  }
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
      model: 'gemini-3.5-flash',
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
      model: 'gemini-3.5-flash',
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
            model: 'gemini-3.5-flash',
            contents: `You are a specialist in ${category || 'General'} projects only.

STRICT CATEGORY RULES:
- ONLY return tools, materials, and products that belong to the declared category: "${category || 'General'}".
- If the video/page content does NOT match the declared category, or contains no relevant physical tools/materials, return an empty array [] immediately.
- Do NOT guess or pull tools from other trades (e.g. no drywall tools for plumbing, no woodworking for electrical, etc.).

Video/Project: "${videoTitle}"
Category: "${category || 'General'}"

The project is "${videoTitle}" in the category "${category || 'General'}".
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
