
import { Product } from "../types.js";

export const searchEbay = async (query: string, limit: number = 10): Promise<Product[]> => {
  try {
    const res = await fetch(`/api/ebay/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (!res.ok) throw new Error('Failed to search eBay');
    return await res.json();
  } catch (error) {
    console.error('eBay Search Error:', error);
    return [];
  }
};

export const getEbayItemDetails = async (itemId: string) => {
  try {
    const res = await fetch(`/api/ebay/item/${itemId}`);
    if (!res.ok) throw new Error('Failed to fetch eBay item');
    return await res.json();
  } catch (error) {
    console.error('eBay Item Fetch Error:', error);
    return null;
  }
};
