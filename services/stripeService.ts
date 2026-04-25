
import type { CartItem } from "../types.js";

import type { SubscriptionStatus } from "../types.js";

/**
 * STRIPE REVENUE SERVICE
 * Strictly for Watch1Do1 platform subscriptions.
 * Tipping is handled P2P (Venmo/QR) and is not processed via Stripe.
 */
export const stripeService = {
  async createSubscriptionSession(userEmail: string, tier: SubscriptionStatus, interval: string = 'monthly'): Promise<{ url?: string; error?: string }> {
    console.log(`[Stripe Revenue] Initializing ${tier} Subscription for:`, userEmail);
    
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, email: userEmail, interval })
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      return { url: data.url };
    } catch (e: any) {
      console.error("[Stripe Service Error]", e);
      return { error: e.message };
    }
  }
};
