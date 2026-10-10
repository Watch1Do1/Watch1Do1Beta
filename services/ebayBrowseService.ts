
import type { Product } from '../types.js';

interface EbayToken {
  access_token: string;
  expires_in: number;
  token_type: string;
  expires_at: number;
}

// Client-credentials scope documented for the Browse API (item_summary/search, item lookups).
export const DEFAULT_EBAY_OAUTH_SCOPE = 'https://api.ebay.com/oauth/api_scope';
const EBAY_MARKETPLACE_ID = 'EBAY_US';

let cachedToken: EbayToken | null = null;

/**
 * Error thrown for any eBay token or Browse API failure.
 * `status` is the HTTP status (0 when no request was made), `errorIds` are eBay's numeric error ids.
 * Messages carry eBay's error body only, never credentials or tokens.
 */
export class EbayApiError extends Error {
  status: number;
  errorIds: number[];
  code?: string;
  constructor(message: string, status: number, errorIds: number[] = [], code?: string) {
    super(message);
    this.name = 'EbayApiError';
    this.status = status;
    this.errorIds = errorIds;
    this.code = code;
  }
}

const parseErrorIds = (body: string): number[] => {
  try {
    const parsed = JSON.parse(body);
    return Array.isArray(parsed?.errors)
      ? parsed.errors.map((e: any) => Number(e?.errorId)).filter((n: number) => !Number.isNaN(n))
      : [];
  } catch {
    return [];
  }
};

/**
 * True only when eBay says this keyset/token is not allowed to use the Browse API
 * (errorId 1100 "Insufficient permissions" or HTTP 403), or eBay is not configured at all.
 * A 404 for a bad item id, a 401 expired token, or a 5xx does NOT count as denied.
 */
export function isEbayAccessDenied(err: unknown): boolean {
  if (!(err instanceof EbayApiError)) return false;
  return err.code === 'EBAY_NOT_CONFIGURED' || err.errorIds.includes(1100) || err.status === 403;
}

export function clearEbayTokenCache() {
  cachedToken = null;
}

async function requestToken(auth: string, scope: string): Promise<Response> {
  return fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${auth}`,
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope }),
  });
}

async function getEbayToken(): Promise<string> {
  if (cachedToken && cachedToken.expires_at > Date.now() + 60000) {
    return cachedToken.access_token;
  }

  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  const scope = (process.env.EBAY_OAUTH_SCOPE || '').trim() || DEFAULT_EBAY_OAUTH_SCOPE;

  if (!clientId || !clientSecret) {
    throw new EbayApiError('eBay credentials missing in environment (EBAY_CLIENT_ID / EBAY_CLIENT_SECRET)', 0, [], 'EBAY_NOT_CONFIGURED');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await requestToken(auth, scope);

  if (!response.ok) {
    cachedToken = null;
    const errorBody = await response.text();
    console.error(`[eBay Auth] Token request failed (HTTP ${response.status}) for scope '${scope}'. eBay response: ${errorBody}`);
    if (errorBody.includes('invalid_scope')) {
      console.error(`[eBay Auth] Scope '${scope}' is not granted to this keyset. Set EBAY_OAUTH_SCOPE to '${DEFAULT_EBAY_OAUTH_SCOPE}' (or unset it) and check the keyset's OAuth scopes in the eBay developer portal.`);
    }
    throw new EbayApiError(`Failed to get eBay token (HTTP ${response.status}): ${errorBody}`, response.status, parseErrorIds(errorBody));
  }

  const data = await response.json() as any;
  cachedToken = {
    ...data,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  return cachedToken!.access_token;
}

function browseHeaders(token: string): Record<string, string> {
  const campid = process.env.EBAY_CAMPAIGN_ID;
  const referenceId = process.env.EBAY_AFFILIATE_REFERENCE_ID;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'X-EBAY-C-MARKETPLACE-ID': EBAY_MARKETPLACE_ID,
    'Content-Type': 'application/json',
  };

  if (campid) {
    headers["X-EBAY-C-ENDUSERCTX"] = `affiliateCampaignId=${campid}${referenceId ? `,affiliateReferenceId=${referenceId}` : ""}`;
  }
  return headers;
}

/**
 * GET a Browse API URL. On 401 (expired/revoked token) the cached token is dropped and the call
 * is retried once with a fresh token. On 1100/403 the cached token is dropped and the scope is logged.
 */
async function browseGet(url: string, label: string): Promise<any> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await getEbayToken();
    const response = await fetch(url, { headers: browseHeaders(token) });
    if (response.ok) {
      return response.json();
    }

    const errorBody = await response.text();
    const errorIds = parseErrorIds(errorBody);

    if (response.status === 401 && attempt === 0) {
      console.warn(`[eBay ${label}] HTTP 401, refreshing token and retrying once. eBay response: ${errorBody}`);
      cachedToken = null;
      continue;
    }

    if (response.status === 401 || response.status === 403 || errorIds.includes(1100)) {
      cachedToken = null;
      const scope = (process.env.EBAY_OAUTH_SCOPE || '').trim() || DEFAULT_EBAY_OAUTH_SCOPE;
      console.error(`[eBay ${label}] Access denied (HTTP ${response.status}, errorIds ${errorIds.join(',') || 'none'}) with token scope '${scope}'. eBay response: ${errorBody}`);
    }

    throw new EbayApiError(`eBay ${label} API error (HTTP ${response.status}): ${errorBody}`, response.status, errorIds);
  }
  // Unreachable: the loop either returns or throws.
  throw new EbayApiError(`eBay ${label} API error: retry exhausted`, 0);
}

export async function searchEbayItems(query: string, limit: number = 10) {
  const data = await browseGet(
    `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    'Search'
  );
  return data.itemSummaries || [];
}

/**
 * Accepts a legacy numeric item id (as in ebay.com/itm/123456789012) or a RESTful id (v1|123456789012|0).
 */
export async function getEbayItem(itemId: string) {
  const id = String(itemId).trim();
  const url = /^\d+$/.test(id)
    ? `https://api.ebay.com/buy/browse/v1/item/get_item_by_legacy_id?legacy_item_id=${encodeURIComponent(id)}`
    : `https://api.ebay.com/buy/browse/v1/item/${encodeURIComponent(id)}`;
  return browseGet(url, 'Item');
}

/** Legacy numeric id for an eBay item: legacyItemId if present, else parsed from v1|<id>|<variation>. */
export function getEbayLegacyId(item: any): string {
  if (item?.legacyItemId) return String(item.legacyItemId);
  const itemId = String(item?.itemId ?? '');
  const match = itemId.match(/^v1\|(\d+)\|/);
  return match ? match[1] : itemId;
}

/** Single mapping from an eBay Browse item (item_summary or item) to the app's Product shape. */
export function normalizeEbayItem(item: any): Product {
  const priceSource = item?.price || item?.currentBidPrice || {};
  const amount = parseFloat(priceSource.value);
  return {
    id: `ebay-${item.itemId}`,
    name: item.title,
    price: {
      amount: Number.isFinite(amount) ? amount : 0,
      currency: priceSource.currency || 'USD',
    },
    available: true,
    imageUrl: item.image?.imageUrl || 'https://picsum.photos/seed/ebay/200/200',
    purchaseUrl: constructEbayAffiliateUrl(getEbayLegacyId(item)),
    retailer: 'eBay',
    stockStatus: 'in-stock',
    condition: item.condition,
    seller: item.seller?.username,
    description: item.shortDescription || item.title,
    evaluation: `Verified eBay listing: ${item.condition || 'New'}. Seller: ${item.seller?.username || 'Unknown'}.`,
    isPartnerProduct: false,
    sourceType: 'verified',
  };
}

export function constructEbayAffiliateUrl(itemId: string) {
  const campid = process.env.EBAY_CAMPAIGN_ID;
  const toolid = process.env.EBAY_TOOL_ID || '10001';
  const mkrid = process.env.EBAY_MKRS_ID || '711-53200-19255-0';
  const customid = process.env.EBAY_AFFILIATE_REFERENCE_ID || 'w1d1_hub_sync';

  return `https://www.ebay.com/itm/${itemId}?mkrid=${mkrid}&siteid=0&campid=${campid}&toolid=${toolid}&customid=${customid}`;
}

export function constructEbaySearchAffiliateUrl(query: string) {
  const campid = process.env.EBAY_CAMPAIGN_ID;
  const toolid = process.env.EBAY_TOOL_ID || '10001';
  const mkrid = process.env.EBAY_MKRS_ID || '711-53200-19255-0';
  const customid = process.env.EBAY_AFFILIATE_REFERENCE_ID || 'w1d1_hub_sync';

  return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&campid=${campid}&toolid=${toolid}&mkrid=${mkrid}&customid=${customid}`;
}
