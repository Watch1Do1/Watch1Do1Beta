
interface EbayToken {
  access_token: string;
  expires_in: number;
  token_type: string;
  expires_at: number;
}

let cachedToken: EbayToken | null = null;

async function getEbayToken(): Promise<string> {
  if (cachedToken && cachedToken.expires_at > Date.now() + 60000) {
    return cachedToken.access_token;
  }

  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  const scope = process.env.EBAY_OAUTH_SCOPE || 'https://api.ebay.com/oauth/api_scope/buy.browse.readonly';

  if (!clientId || !clientSecret) {
    throw new Error('eBay credentials missing in environment');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${auth}`,
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: scope,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get eBay token: ${error}`);
  }

  const data = await response.json() as any;
  cachedToken = {
    ...data,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  return cachedToken!.access_token;
}

export async function searchEbayItems(query: string, limit: number = 10) {
  const token = await getEbayToken();
  
  const campid = process.env.EBAY_CAMPAIGN_ID;
  const referenceId = process.env.EBAY_AFFILIATE_REFERENCE_ID;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
    'Content-Type': 'application/json',
  };

  if (campid) {
    headers["X-EBAY-C-ENDUSERCTX"] = `affiliateCampaignId=${campid}${referenceId ? `,affiliateReferenceId=${referenceId}` : ""}`;
  }
  
  const response = await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
    headers
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`eBay Search API error: ${error}`);
  }

  const data = await response.json() as any;
  return data.itemSummaries || [];
}

export async function getEbayItem(itemId: string) {
  const token = await getEbayToken();
  
  const response = await fetch(`https://api.ebay.com/buy/browse/v1/item/${itemId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`eBay Item API error: ${error}`);
  }

  return await response.json();
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
