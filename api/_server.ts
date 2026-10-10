
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';
import crypto from 'crypto';
import Stripe from 'stripe';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';
import { 
  generateProductsFromText, 
  generateProductsFromImages, 
  generateProductsFromUrl, 
  generateComplementaryProducts, 
  generateV3ProjectInsights,
  searchSpecificProduct,
  revalidateProductAvailability,
  generateDeepDiveProducts,
  createProjectAssistantChat
} from '../services/geminiService.js';
import { 
  searchEbayItems, 
  getEbayItem, 
  normalizeEbayItem 
} from '../services/ebayBrowseService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

let stripeInstance: Stripe | null = null;
const getStripe = () => {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is required for this operation. Please set it in the application settings.');
    }
    stripeInstance = new Stripe(key, {
      apiVersion: '2024-12-18.acacia' as any,
    });
  }
  return stripeInstance;
};

// Webhook for subscription updates.
// Registered BEFORE express.json so Stripe gets the exact raw body it signed.
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error("[Stripe Webhook] Missing stripe-signature header or STRIPE_WEBHOOK_SECRET");
    return res.status(400).send('Webhook Error: Missing signature or secret');
  }

  let event;

  try {
    event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return res.status(400).send('Webhook signature verification failed');
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const sessionEmail = session.metadata?.email;
        const tier = session.metadata?.tier;

        if (typeof sessionEmail !== 'string' || !sessionEmail || !['Plus', 'Pro', 'Studio'].includes(tier)) {
          console.error(`[Stripe Webhook] checkout.session.completed ${session.id} missing/invalid metadata (email or tier); no update applied`);
          return res.json({ received: true });
        }

        // Calculate XP reward based on tier
        let xpReward = 0;
        if (tier === 'Plus') xpReward = 500;
        else if (tier === 'Pro') xpReward = 1500;
        else if (tier === 'Studio') xpReward = 3000;

        const database = await getDb();
        await database.collection("users").updateOne(
          { email: sessionEmail.toLowerCase() },
          { 
            $set: { subscriptionStatus: tier },
            $inc: { makerXP: xpReward }
          }
        );
        await database.collection("videos").updateMany(
          { creatorId: sessionEmail.toLowerCase() },
          { $set: { creatorSubscriptionStatus: tier } }
        );
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        // In a real app we'd look up email by customer ID
        // But for this purpose let's assume metadata or similar works or we just log it
        // For testing/mocking in this environment we can use the manual handleCancel if needed
        console.log(`Subscription deleted: ${subscription.id}`);
        break;
      }
    }
  } catch (e: any) {
    // 500 (no details) so Stripe retries the delivery
    console.error("[Stripe Webhook] Processing failed:", e);
    return res.status(500).send('Webhook processing failed');
  }

  res.json({ received: true });
});

// JSON body parser for every other route. Vercel caps request bodies at ~4.5MB anyway.
app.use(express.json({ limit: '4mb' }));

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', environment: process.env.VERCEL ? 'vercel' : 'local', db: !!db });
});

// MongoDB Connection Setup
const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = "watch1do1";

if (MONGODB_URI) {
  const maskedUri = MONGODB_URI.replace(/\/\/.*:.*@/, "//****:****@");
  console.log(`[Database] MONGODB_URI detected: ${maskedUri}`);
  
  // Sanity checks for common placeholder mistakes
  if (MONGODB_URI.includes('<password>') || MONGODB_URI.includes('<password')) {
    console.warn("⚠️ ERROR: Your MONGODB_URI still contains the '<password>' placeholder. Please replace it with your actual database password in the settings.");
  }
  if (MONGODB_URI.includes('<username>') || MONGODB_URI.includes('<username')) {
    console.warn("⚠️ ERROR: Your MONGODB_URI still contains the '<username>' placeholder. Please replace it with your database username.");
  }
} else {
  console.warn("[Database] No MONGODB_URI found in environment variables.");
}

let db: any = null;

async function getDb() {
  if (db) return db;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI missing on server");
  }
  const client = new MongoClient(MONGODB_URI, {
    connectTimeoutMS: 20000,
    serverSelectionTimeoutMS: 20000,
    socketTimeoutMS: 45000,
    family: 4, // Force IPv4 to avoid handshake issues in some cloud environments
    retryWrites: true,
  });
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB Native Driver");
    db = client.db(DB_NAME);
    return db;
  } catch (error: any) {
    if (error.message?.includes('alert number 80')) {
        console.error("❌ MongoDB Firewall Error (SSL Alert 80): This usually means your MongoDB Atlas IP Whitelist (0.0.0.0/0) hasn't fully propagated yet. Please wait 2-3 minutes.");
    } else if (error.message?.includes('bad auth') || error.code === 8000) {
        console.error("❌ MongoDB AUTHENTICATION FAILED: The password or username in your MONGODB_URI is incorrect. If you have special characters in your password, ensure they are URL-encoded.");
    }
    console.error("❌ MongoDB Connection Disaster:", error);
    throw error;
  }
}

// --- SESSION AUTHENTICATION & SECURITY HELPERS ---
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
// Ephemeral in-memory secret in development if missing; never fall back to a hardcoded secret in production
const devSessionSecret = (!isProduction && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32))
  ? crypto.randomBytes(32).toString('hex')
  : '';

function hasValidSessionSecret(): boolean {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    if (isProduction) {
      console.error("[Auth] SESSION_SECRET missing");
      return false;
    }
  }
  return true;
}

function getSessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) {
    return secret;
  }
  if (isProduction) {
    console.error("[Auth] SESSION_SECRET missing");
    return null;
  }
  return devSessionSecret;
}

function createSessionToken(email: string, tokenVersion: number): string {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error("SESSION_SECRET missing");
  }
  const payload = {
    e: email,
    v: tokenVersion,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
  };
  const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(b64Payload).digest('base64url');
  return `${b64Payload}.${sig}`;
}

function verifySessionToken(token: string): { email: string; v: number } | null {
  try {
    const secret = getSessionSecret();
    if (!secret) return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [b64Payload, sig] = parts;
    if (!b64Payload || !sig) return null;

    const expectedSig = crypto.createHmac('sha256', secret).update(b64Payload).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const json = Buffer.from(b64Payload, 'base64url').toString('utf8');
    const payload = JSON.parse(json);
    if (!payload || !payload.exp || Date.now() > payload.exp) {
      return null;
    }
    return { email: payload.e, v: payload.v };
  } catch {
    return null;
  }
}

function getSessionCookie(req: express.Request): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';');
  for (const c of cookies) {
    const trimmed = c.trim();
    if (trimmed.startsWith('w1d1_session=')) {
      return trimmed.slice('w1d1_session='.length);
    }
  }
  return null;
}

function setSessionCookie(res: express.Response, token: string) {
  res.setHeader(
    'Set-Cookie',
    `w1d1_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000` + (isProduction ? '; Secure' : '')
  );
}

function clearSessionCookie(res: express.Response) {
  res.setHeader(
    'Set-Cookie',
    `w1d1_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0` + (isProduction ? '; Secure' : '')
  );
}

async function loadUser(req: express.Request, _res: express.Response, next: express.NextFunction) {
  try {
    if ((req as any).user) {
      return next();
    }
    const token = getSessionCookie(req);
    if (token) {
      const verified = verifySessionToken(token);
      if (verified && verified.email) {
        const database = await getDb();
        const user = await database.collection("users").findOne({ email: verified.email.toLowerCase() });
        if (user && (user.tokenVersion || 0) === verified.v) {
          (req as any).user = user;
        }
      }
    }
  } catch {
    // loadUser never blocks
  }
  next();
}

async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!hasValidSessionSecret()) {
    return res.status(500).json({ error: "Server misconfigured" });
  }
  if (!(req as any).user) {
    await loadUser(req, res, () => {});
  }
  if (!(req as any).user) {
    return res.status(401).json({ error: "Sign in required" });
  }
  next();
}

async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!hasValidSessionSecret()) {
    return res.status(500).json({ error: "Server misconfigured" });
  }
  if (!(req as any).user) {
    await loadUser(req, res, () => {});
  }
  if (!(req as any).user) {
    return res.status(401).json({ error: "Sign in required" });
  }
  if ((req as any).user.isAdmin !== true) {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
}

function sanitizeUser(user: any) {
  if (!user) return null;
  const { 
    password, 
    passwordHash, 
    resetToken, 
    resetTokenHash, 
    resetTokenExpiry, 
    tokenVersion, 
    ...safeUser 
  } = user;
  return safeUser;
}

function publicProfile(user: any) {
  if (!user) return null;
  return {
    displayName: user.displayName || '',
    handle: user.handle || '',
    bio: user.bio || '',
    avatarUrl: user.avatarUrl || '',
    tipQrUrl: user.tipQrUrl || '',
    venmoHandle: user.venmoHandle || '',
    makerRank: user.makerRank || 'Apprentice',
    isVerifiedPartner: !!user.isVerifiedPartner
  };
}

// Logs the real error on the server and returns a generic message to the client.
function sendServerError(res: express.Response, tag: string, e: any) {
  console.error(tag, e);
  if (!res.headersSent) {
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}

// --- RATE LIMITING ---
// In-memory, per serverless instance. Instances don't share memory, so this limits
// casual abuse per instance, not a determined distributed attacker.
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
let rateLimitCalls = 0;

function clientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  return first || req.socket.remoteAddress || 'unknown';
}

function rateLimit(name: string, max: number, windowMs: number, keyFn: (req: express.Request) => string | null) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const now = Date.now();

    rateLimitCalls++;
    if (rateLimitCalls % 500 === 0) {
      for (const [k, bucket] of rateBuckets) {
        if (now > bucket.resetAt) rateBuckets.delete(k);
      }
    }

    const keyPart = keyFn(req);
    if (keyPart === null) return next();
    const key = `${name}:${keyPart}`;

    let bucket = rateBuckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      rateBuckets.set(key, bucket);
    }
    bucket.count++;

    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }
    next();
  };
}

const byIp = (req: express.Request) => clientIp(req);
const byUser = (req: express.Request) => (req as any).user?.email?.toLowerCase() || null;

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const loginLimit = rateLimit('login', 10, 15 * MINUTE, byIp);
const signupLimit = rateLimit('signup', 5, HOUR, byIp);
const forgotPasswordLimit = rateLimit('forgot', 5, HOUR, byIp);
const resetPasswordLimit = rateLimit('reset', 10, HOUR, byIp);
const contactLimit = rateLimit('contact', 5, HOUR, byIp);
const emailSendLimit = rateLimit('email', 20, HOUR, byUser);
const aiLimit = rateLimit('ai', 30, 10 * MINUTE, byUser);
// Price checks run automatically when a signed-in user opens a hub, so they get their own bucket
// instead of eating into the analyze/chat allowance.
const aiRevalidateLimit = rateLimit('aiRevalidate', 60, 10 * MINUTE, byUser);
const incrementLimit = rateLimit('increment', 300, HOUR, byIp);
const betaFeedbackLimit = rateLimit('feedback', 5, HOUR, byIp);

// --- AI DAILY BUDGET ---
const AI_DAILY_LIMIT_USD = Number(process.env.AI_DAILY_LIMIT_USD || 20);

async function aiBudgetExceeded(): Promise<boolean> {
  const database = await getDb();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [row] = await database.collection("ai_usage_logs").aggregate([
    { $match: { timestamp: { $gte: oneDayAgo } } },
    { $group: { _id: null, total: { $sum: "$estimatedCost" } } }
  ]).toArray();
  return (row?.total || 0) >= AI_DAILY_LIMIT_USD;
}

async function aiBudgetGuard(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    if (await aiBudgetExceeded()) {
      console.error("[AI Budget] daily limit reached");
      return res.status(503).json({ error: "AI is temporarily paused. Please try again later." });
    }
    next();
  } catch (e: any) {
    sendServerError(res, '[AI Budget]', e);
  }
}

// --- HTML / EMAIL HELPERS ---
function escapeHtml(value: any): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const EMAIL_REGEX = /^[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[^\s@<>()"',;:]+$/;

function isValidEmail(value: any): value is string {
  return typeof value === 'string' && value.length <= 254 && EMAIL_REGEX.test(value);
}

function stripCrLf(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

// Strips active content from client-built email HTML while keeping inline-styled markup.
function sanitizeEmailHtml(html: string): string {
  let out = html;
  // Elements removed together with their content
  out = out.replace(/<(script|style|iframe|object|form|button)\b[\s\S]*?<\/\1\s*>/gi, '');
  // Remaining opening/closing/self-closing tags of blocked elements (incl. void elements)
  out = out.replace(/<\/?(script|style|iframe|object|embed|form|input|button|link|meta|base)\b[^>]*>/gi, '');
  // Inline event handlers: on*="..." / on*='...' / on*=value
  out = out.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // Dangerous URL schemes in href/src (data:image/ is allowed)
  out = out.replace(/\b(href|src)\s*=\s*(?:"\s*(?:javascript:|vbscript:|data:(?!image\/))[^"]*"|'\s*(?:javascript:|vbscript:|data:(?!image\/))[^']*'|(?:javascript:|vbscript:|data:(?!image\/))[^\s>]*)/gi, '$1="#"');
  return out;
}

// --- VIDEO OWNERSHIP ---
const AI_CREATOR_ID = 'ai@watch1do1.com';
const VIDEO_STATUSES = ['curating', 'pending_review', 'published', 'rejected'];

function canEditVideo(user: any, video: any): boolean {
  if (!user || !video) return false;
  if (user.isAdmin === true) return true;
  if (typeof video.creatorId === 'string' && video.creatorId.toLowerCase() === user.email.toLowerCase()) return true;
  return !!(user.isVerifiedPartner && user.partnerId && Array.isArray(video.products) &&
    video.products.some((p: any) => p?.merchantId && p.merchantId === user.partnerId));
}

function pickFields(source: any, fields: string[]): Record<string, any> {
  const out: Record<string, any> = {};
  if (!source || typeof source !== 'object') return out;
  for (const key of fields) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      out[key] = source[key];
    }
  }
  return out;
}


// Helper: Generate a unique maker handle
function generateHandle(email: string) {
  const base = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}_${suffix}`;
}

// Helper: Log Audit Entry
async function logAudit(action: string, email: string, metadata: any = {}) {
  try {
    const database = await getDb();
    const user = await database.collection("users").findOne({ email: email.toLowerCase() });
    await database.collection("audit_logs").insertOne({
      id: crypto.randomUUID(),
      action,
      userId: user?._id?.toString() || 'unknown',
      userEmail: email,
      metadata,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error("[Audit Log Error]", e);
  }
}

// Helper: Log AI Usage & Cost Metrics
async function logAiUsage(endpoint: string, model: string, estimatedCost: number, category?: string, duration?: string) {
  try {
    const database = await getDb();
    if (database) {
      await database.collection("ai_usage_logs").insertOne({
        id: crypto.randomUUID(),
        endpoint,
        model,
        estimatedCost,
        category: category || null,
        duration: duration || null,
        timestamp: new Date().toISOString()
      });
    }
  } catch (e) {
    console.error("[AI Cost Logging Failure]", e);
  }
}

// STRIPE ROUTES
app.post('/api/stripe/create-checkout-session', requireAuth, async (req, res) => {
  try {
    const { tier, interval } = req.body;
    const email = (req as any).user.email.toLowerCase();

    if (!['Plus', 'Pro', 'Studio'].includes(tier)) {
      return res.status(400).json({ error: "Invalid plan" });
    }
    if (interval !== undefined && interval !== 'monthly' && interval !== 'annual') {
      return res.status(400).json({ error: "Invalid billing interval" });
    }
    
    const isAnnual = interval === 'annual';
    const priceIds: Record<string, string | undefined> = {
      Plus: isAnnual ? process.env.STRIPE_PRICE_PLUS_ANNUAL : process.env.STRIPE_PRICE_PLUS,
      Pro: isAnnual ? process.env.STRIPE_PRICE_PRO_ANNUAL : process.env.STRIPE_PRICE_PRO,
      Studio: isAnnual ? process.env.STRIPE_PRICE_STUDIO_ANNUAL : process.env.STRIPE_PRICE_STUDIO,
    };

    const priceId = priceIds[tier];
    if (!priceId) {
      const missingVar = `STRIPE_PRICE_${tier.toUpperCase()}${isAnnual ? '_ANNUAL' : ''}`;
      console.error(`[Stripe Error] ${missingVar} is not set`);
      return res.status(500).json({ error: "Checkout is not configured" });
    }

    const host = req.headers['host'];
    const isLocalhost = host?.includes('localhost') || host?.includes('127.0.0.1');
    const protocol = isLocalhost ? 'http' : (req.headers['x-forwarded-proto'] || 'https');
    const successUrl = `${protocol}://${host}?session_id={CHECKOUT_SESSION_ID}&status=success`;
    const cancelUrl = `${protocol}://${host}?status=cancel`;

    const session = await getStripe().checkout.sessions.create({
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        tier,
        email,
      },
    });

    res.json({ url: session.url });
  } catch (e: any) {
    sendServerError(res, "[Stripe Error]", e);
  }
});

const RESEND_SENDER = 'Watch1Do1 <security@watch1do1.com>';

// --- AUTHENTICATION ROUTES ---

app.post('/api/auth/signup', signupLimit, async (req, res) => {
    try {
        if (!hasValidSessionSecret()) {
            return res.status(500).json({ error: "Server misconfigured" });
        }
        const { email, password, isOver18 } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Missing identity data" });
        if (typeof email !== 'string') return res.status(400).json({ error: "Missing identity data" });
        if (typeof password !== 'string' || password.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters" });
        }

        const database = await getDb();
        const existing = await database.collection("users").findOne({ email: email.toLowerCase() });
        if (existing) return res.status(400).json({ error: "Maker already registered" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const normalizedEmail = email.toLowerCase();

        const newUser = {
            email: normalizedEmail,
            password: hashedPassword,
            displayName: normalizedEmail.split('@')[0],
            subscriptionStatus: 'Free',
            bio: 'Active Maker.',
            favoritedVideoIds: [],
            purchaseHistory: [],
            completedProjects: [],
            isAdmin: false,
            isVerifiedPartner: false,
            makerXP: 25,
            makerRank: 'Apprentice',
            pendingBalance: 0,
            totalTipsReported: 0,
            isOver18: !!isOver18,
            stripeConnected: false,
            gamificationEnabled: true,
            tokenVersion: 0,
            scannedVideoIds: []
        };

        await database.collection("users").insertOne(newUser);
        
        const token = createSessionToken(normalizedEmail, 0);
        setSessionCookie(res, token);
        res.json({ user: sanitizeUser(newUser) });
    } catch (e: any) {
        sendServerError(res, '[POST /api/auth/signup]', e);
    }
});

app.post('/api/auth/login', loginLimit, async (req, res) => {
    try {
        if (!hasValidSessionSecret()) {
            return res.status(500).json({ error: "Server misconfigured" });
        }
        const { email, password } = req.body;
        if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ error: "Missing email or password" });
        }

        const database = await getDb();
        const user = await database.collection("users").findOne({ email: email.toLowerCase() });
        
        if (!user || !user.password) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: "Invalid credentials" });

        const tokenVersion = user.tokenVersion || 0;
        const token = createSessionToken(user.email, tokenVersion);
        setSessionCookie(res, token);

        res.json({ user: sanitizeUser(user) });
    } catch (e: any) {
        sendServerError(res, '[POST /api/auth/login]', e);
    }
});

app.get('/api/auth/me', loadUser, async (req, res) => {
    try {
        if (!hasValidSessionSecret()) {
            return res.status(500).json({ error: "Server misconfigured" });
        }
        const user = (req as any).user;
        if (!user) {
            return res.status(401).json({ error: "Not signed in" });
        }
        res.json({ user: sanitizeUser(user) });
    } catch (e: any) {
        sendServerError(res, '[GET /api/auth/me]', e);
    }
});

app.post('/api/auth/logout', (req, res) => {
    clearSessionCookie(res);
    res.json({ success: true });
});

app.post('/api/auth/forgot-password', forgotPasswordLimit, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || typeof email !== 'string') {
            return res.json({ success: true, message: "If that email has an account, a reset link has been sent." });
        }

        console.log("[Auth] Reset requested");

        const database = await getDb();
        const user = await database.collection("users").findOne({ email: email.toLowerCase() });
        
        if (user) {
            const rawToken = crypto.randomBytes(32).toString('hex');
            const resetTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
            const expiry = Date.now() + 3600000; // 1 hour

            await database.collection("users").updateOne(
                { email: user.email },
                { 
                    $set: { resetTokenHash, resetTokenExpiry: expiry },
                    $unset: { resetToken: "" }
                }
            );

            const appUrl = (process.env.APP_URL || 'https://www.watch1do1.com').replace(/\/+$/, '');
            const resetLink = `${appUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

            const resendKey = process.env.RESEND_API_KEY;
            if (resendKey) {
                try {
                    const resend = new Resend(resendKey);
                    await resend.emails.send({
                        from: 'Watch1Do1 <onboarding@resend.dev>',
                        to: user.email,
                        subject: 'Maker Hub Recovery Link',
                        html: `
                            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px; background: #020617; color: #f8fafc; border-radius: 32px; border: 1px solid #1e293b;">
                                <div style="text-align: center; margin-bottom: 30px;">
                                    <h1 style="color: #7D8FED; font-size: 28px; font-weight: 900; margin: 0; letter-spacing: -1px;">Security Recovery</h1>
                                    <p style="text-transform: uppercase; font-size: 9px; color: #475569; letter-spacing: 4px; margin-top: 8px; font-weight: 800;">Watch1Do1 Auth Protocol</p>
                                </div>
                    
                                <p style="font-size: 14px; line-height: 1.6; color: #94a3b8;">A security recovery request was initialized for your Maker Profile. Click the button below to synchronize a new access key.</p>
                                
                                <div style="text-align: center; margin: 40px 0;">
                                    <a href="${resetLink}" style="background: #7D8FED; color: white; padding: 18px 32px; border-radius: 16px; text-decoration: none; font-weight: 900; text-transform: uppercase; font-size: 12px; letter-spacing: 2px; box-shadow: 0 10px 20px rgba(125, 143, 237, 0.2);">Reset Access Key</a>
                                </div>
                    
                                <div style="background: #0f172a; padding: 20px; border-radius: 12px; border: 1px solid #1e293b; margin-top: 20px;">
                                    <p style="font-size: 11px; color: #475569; margin: 0; text-align: center;">
                                        This link will expire in 1 hour. If you did not initialize this transmission, please ignore this email.
                                    </p>
                                </div>
                            </div>
                        `
                    });
                } catch (emailErr) {
                    console.error("[Auth] Resend dispatch failed:", emailErr);
                }
            } else {
                console.error("[Auth] Missing RESEND_API_KEY");
            }
        }
        
        res.json({ success: true, message: "If that email has an account, a reset link has been sent." });
    } catch (e: any) {
        sendServerError(res, '[POST /api/auth/forgot-password]', e);
    }
});

app.post('/api/auth/reset-password', resetPasswordLimit, async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;
        if (!email || !token || !newPassword || typeof email !== 'string' || typeof token !== 'string' || typeof newPassword !== 'string') {
            return res.status(400).json({ error: "Missing required fields" });
        }
        if (typeof newPassword !== 'string' || newPassword.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters" });
        }

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const database = await getDb();
        const user = await database.collection("users").findOne({ 
            email: email.toLowerCase(),
            resetTokenHash: tokenHash,
            resetTokenExpiry: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ error: "Invalid or expired token" });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await database.collection("users").updateOne(
            { email: email.toLowerCase() },
            { 
                $set: { password: hashedPassword },
                $unset: { resetToken: "", resetTokenHash: "", resetTokenExpiry: "" },
                $inc: { tokenVersion: 1 }
            }
        );

        res.json({ success: true });
    } catch (e: any) {
        sendServerError(res, '[POST /api/auth/reset-password]', e);
    }
});

// --- ADMIN MANAGEMENT ROUTES ---

app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
        const database = await getDb();
        const users = await database.collection("users").find({}).toArray();
        res.json(users.map(sanitizeUser));
    } catch (e: any) {
        sendServerError(res, '[GET /api/admin/users]', e);
    }
});

const ALLOWED_ADMIN_USER_FIELDS = [
    'isAdmin',
    'isVerifiedPartner',
    'subscriptionStatus',
    'company',
    'partnerId',
    'verifiedStatus',
    'makerRank',
    'makerXP'
];

app.post('/api/admin/users/update', requireAdmin, async (req, res) => {
    try {
        const { email, updates } = req.body;
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ error: "Email required" });
        }
        const targetEmail = email.toLowerCase();
        const reqUser = (req as any).user;

        const filteredUpdates: Record<string, any> = {};
        if (updates && typeof updates === 'object') {
            for (const key of ALLOWED_ADMIN_USER_FIELDS) {
                if (updates.hasOwnProperty(key)) {
                    filteredUpdates[key] = updates[key];
                }
            }
        }

        if (targetEmail === reqUser.email.toLowerCase() && filteredUpdates.hasOwnProperty('isAdmin') && filteredUpdates.isAdmin !== true) {
            return res.status(400).json({ error: "You cannot remove your own admin access" });
        }

        const database = await getDb();
        const updateOp: any = { $set: filteredUpdates };
        if (filteredUpdates.hasOwnProperty('isAdmin')) {
            updateOp.$inc = { tokenVersion: 1 };
        }

        await database.collection("users").updateOne(
            { email: targetEmail },
            updateOp
        );

        await logAudit('admin_user_update', reqUser.email, {
            actor: reqUser.email,
            targetEmail,
            changes: filteredUpdates
        });

        res.json({ success: true });
    } catch (e: any) {
        sendServerError(res, '[POST /api/admin/users/update]', e);
    }
});

app.post('/api/contact', contactLimit, async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!isValidEmail(email)) {
            return res.status(400).json({ error: "Please enter a valid email address." });
        }
        if (typeof name !== 'string' || name.length > 100) {
            return res.status(400).json({ error: "Name must be 100 characters or fewer." });
        }
        if (typeof subject !== 'string' || subject.length > 200) {
            return res.status(400).json({ error: "Subject must be 200 characters or fewer." });
        }
        if (typeof message !== 'string' || !message.trim() || message.length > 5000) {
            return res.status(400).json({ error: "Message is required and must be 5000 characters or fewer." });
        }

        const resendKey = process.env.RESEND_API_KEY;
        
        console.log("[Contact] Transmission initialized");

        if (resendKey) {
            const resend = new Resend(resendKey);
            // Use onboarding@resend.dev if custom domain isn't verified yet
            // IMPORTANT: If domain is not verified, you can only send to your own registered email!
            const fromEmail = 'onboarding@resend.dev'; 
            const recipientEmail = process.env.CONTACT_RECIPIENT || 'team@watch1do1.com';
            
            const data = await resend.emails.send({
                from: `Watch1Do1 <${fromEmail}>`,
                to: recipientEmail,
                replyTo: email,
                subject: `New Workshop Inquiry: ${stripCrLf(subject)}`,
                html: `
                    <div style="font-family: sans-serif; background: #020617; color: #f8fafc; padding: 40px; border-radius: 24px;">
                        <h2 style="color: #7D8FED; margin-top: 0;">New Workshop Inquiry</h2>
                        <p style="margin-bottom: 20px; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">
                            <strong>From:</strong> ${escapeHtml(name)} (&lt;${escapeHtml(email)}&gt;)<br/>
                            <strong>Vector:</strong> ${escapeHtml(subject)}
                        </p>
                        <div style="background: #0f172a; padding: 25px; border-radius: 16px; border: 1px solid #1e293b;">
                            <p style="white-space: pre-wrap; margin: 0; line-height: 1.6; color: #94a3b8;">${escapeHtml(message)}</p>
                        </div>
                        <p style="font-size: 11px; color: #475569; margin-top: 20px;">
                            Watch1Do1 Automated Relay Protocol
                        </p>
                    </div>
                `
            });
            
            if ((data as any).error) {
                console.error("[Contact] Resend API Error:", (data as any).error);
                throw new Error((data as any).error.message || "Resend dispatch failed");
            }

            console.log(`[Contact] Message dispatched via Resend. ID: ${(data as any).id || 'N/A'}`);
            res.json({ success: true });
        } else {
            console.warn("[Contact] RESEND_API_KEY missing. Simulating success for development.");
            res.json({ success: true, warning: 'Simulated' });
        }
    } catch (e: any) {
        sendServerError(res, '[Contact] Error:', e);
    }
});

// Transactional email relay used by the client (kit emails, admin approval/rejection notices).
// Locked down: signed-in users only, non-admins may only email themselves.
app.post('/api/email/send', requireAuth, emailSendLimit, async (req, res) => {
    try {
        const reqUser = (req as any).user;
        const { to, subject, html } = req.body;

        if (!isValidEmail(to)) {
            return res.status(400).json({ error: "A single valid recipient email is required." });
        }
        if (typeof subject !== 'string' || !stripCrLf(subject) || subject.length > 200) {
            return res.status(400).json({ error: "Subject is required and must be 200 characters or fewer." });
        }
        if (typeof html !== 'string' || !html || html.length > 100 * 1024) {
            return res.status(400).json({ error: "Email body is required and must be under 100KB." });
        }

        if (reqUser.isAdmin !== true && to.toLowerCase() !== reqUser.email.toLowerCase()) {
            return res.status(403).json({ error: "You can only send emails to your own address." });
        }

        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) {
            console.error("[EmailAPI] RESEND_API_KEY missing");
            return res.status(503).json({ error: "Email is not configured" });
        }

        const resend = new Resend(resendKey);
        const data = await resend.emails.send({
            from: 'Watch1Do1 <onboarding@resend.dev>',
            to,
            subject: stripCrLf(subject),
            html: sanitizeEmailHtml(html)
        });

        if ((data as any).error) {
            return sendServerError(res, '[EmailAPI] Resend API Error:', (data as any).error);
        }

        res.json({ success: true });
    } catch (e: any) {
        sendServerError(res, '[EmailAPI] Error:', e);
    }
});

// AI ROUTES
app.post('/api/ai/products/text', requireAuth, aiLimit, aiBudgetGuard, async (req, res) => {
  try {
    const { text, category } = req.body;
    const products = await generateProductsFromText(text, category);
    await logAiUsage('/api/ai/products/text', 'gemini-3.5-flash', 0.00056, category);
    res.json(products);
  } catch (e: any) {
    sendServerError(res, '[POST /api/ai/products/text]', e);
  }
});

app.post('/api/ai/products/images', requireAuth, aiLimit, aiBudgetGuard, async (req, res) => {
  try {
    const { images, mimeType, category } = req.body;
    const products = await generateProductsFromImages(images, mimeType, category);
    await logAiUsage('/api/ai/products/images', 'gemini-3.5-flash', 0.00058, category);
    res.json(products);
  } catch (e: any) {
    sendServerError(res, '[POST /api/ai/products/images]', e);
  }
});

app.post('/api/ai/products/url', requireAuth, aiLimit, aiBudgetGuard, async (req, res) => {
  try {
    const { url, category } = req.body;
    const products = await generateProductsFromUrl(url, category);
    await logAiUsage('/api/ai/products/url', 'gemini-3.5-flash', 0.00062, category);
    res.json(products);
  } catch (e: any) {
    sendServerError(res, '[POST /api/ai/products/url]', e);
  }
});

app.post('/api/ai/products/deepdive', requireAuth, aiLimit, aiBudgetGuard, async (req, res) => {
    try {
        const { title, existing, category } = req.body;
        const products = await generateDeepDiveProducts(title, existing, category);
        await logAiUsage('/api/ai/products/deepdive', 'gemini-3.5-flash', 0.00056, category);
        res.json(products);
    } catch (e: any) {
        sendServerError(res, '[POST /api/ai/products/deepdive]', e);
    }
});

app.post('/api/ai/products/complementary', requireAuth, aiLimit, aiBudgetGuard, async (req, res) => {
  try {
    const { title, existing, category } = req.body;
    const products = await generateComplementaryProducts(title, existing, category);
    await logAiUsage('/api/ai/products/complementary', 'gemini-3.5-flash', 0.00045, category);
    res.json(products);
  } catch (e: any) {
    sendServerError(res, '[POST /api/ai/products/complementary]', e);
  }
});

app.post('/api/ai/insights', requireAuth, aiLimit, aiBudgetGuard, async (req, res) => {
  try {
    const { title, products, category } = req.body;
    const insights = await generateV3ProjectInsights(title, products, category);
    await logAiUsage('/api/ai/insights', 'gemini-3.1-pro-preview', 0.01375, category);
    res.json(insights);
  } catch (e: any) {
    sendServerError(res, '[POST /api/ai/insights]', e);
  }
});

app.post('/api/ai/search', requireAuth, aiLimit, aiBudgetGuard, async (req, res) => {
  try {
    const { query } = req.body;
    const products = await searchSpecificProduct(query);
    await logAiUsage('/api/ai/search', 'gemini-3.5-flash', 0.00056);
    res.json(products);
  } catch (e: any) {
    sendServerError(res, '[POST /api/ai/search]', e);
  }
});

app.post('/api/ai/revalidate', requireAuth, aiRevalidateLimit, aiBudgetGuard, async (req, res) => {
  try {
    const { product } = req.body;
    const update = await revalidateProductAvailability(product);
    await logAiUsage('/api/ai/revalidate', 'gemini-3.5-flash', 0.00045, product?.category);
    res.json(update);
  } catch (e: any) {
    sendServerError(res, '[POST /api/ai/revalidate]', e);
  }
});

app.post('/api/ai/chat', requireAuth, aiLimit, aiBudgetGuard, async (req, res) => {
  try {
    const { videoTitle, products, message } = req.body;
    if (typeof message !== 'string' || !message.trim() || message.length > 4000) {
      return res.status(400).json({ error: "Message is required and must be 4000 characters or fewer." });
    }
    const history = Array.isArray(req.body.history) ? req.body.history.slice(-20) : [];

    const chatInstance = createProjectAssistantChat(videoTitle, products);

    if (history && history.length > 0) {
      chatInstance.history = history.map((h: any) => ({
        role: h.role === 'model' ? 'model' : 'user',
        parts: [{ text: h.text }]
      }));
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await chatInstance.sendMessageStream({ message });

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    await logAiUsage('/api/ai/chat', 'gemini-3.1-pro-preview', 0.00962);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (e: any) {
    if (!res.headersSent) {
      sendServerError(res, "[Server Chat Error]:", e);
    } else {
      console.error("[Server Chat Error]:", e);
      res.write(`data: ${JSON.stringify({ error: "Something went wrong" })}\n\n`);
      res.end();
    }
  }
});

// EBAY ROUTES
app.get('/api/ebay/search', async (req, res) => {
  try {
    const { q, limit } = req.query;
    const items = await searchEbayItems(q as string, limit ? Number(limit) : 10);
    
    // Normalize to internal Product type (shared with geminiService's server-side eBay path)
    const normalized = items.map(normalizeEbayItem);
    
    res.json(normalized);
  } catch (e: any) {
    sendServerError(res, '[GET /api/ebay/search]', e);
  }
});

app.get('/api/ebay/item/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const item = await getEbayItem(id);
    res.json(item);
  } catch (e: any) {
    sendServerError(res, '[GET /api/ebay/item/:id]', e);
  }
});

app.get('/api/ebay/account-deletion', (req, res) => {
  const challengeCode = (req.query.challenge_code as string)?.trim();
  const verificationToken = process.env.EBAY_DELETION_VERIFICATION_TOKEN?.trim();
  
  // Dynamically determine the endpoint URL if not explicitly set
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['host'];
  const currentUrl = `${protocol}://${host}/api/ebay/account-deletion`;
  const endpoint = (process.env.EBAY_DELETION_ENDPOINT || currentUrl).trim().replace(/"/g, '');

  console.log("--- eBay Account Deletion Validation ---");
  console.log("Time:", new Date().toISOString());
  console.log("Verification Token (exists):", !!verificationToken);
  console.log("Calculated Endpoint URL:", endpoint);

  if (!verificationToken) {
    console.error("[eBay Deletion] EBAY_DELETION_VERIFICATION_TOKEN is not set");
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
  if (!challengeCode) {
    return res.status(400).json({ error: "Missing challenge_code" });
  }

  try {
    const hash = crypto.createHash('sha256');
    hash.update(challengeCode);
    hash.update(verificationToken);
    hash.update(endpoint);
    const responseHash = hash.digest('hex');

    return res.status(200).json({
      challengeResponse: responseHash
    });
  } catch (error) {
    console.error("Error generating eBay hash:", error);
    return res.status(500).json({ error: "Hash generation failed" });
  }
});

app.post('/api/ebay/account-deletion', (req, res) => {
  // Acknowledge receipt of deletion notice
  return res.status(200).json({ status: 'ok' });
});

// API ROUTES

// Fields a client may send when creating a video. Everything else is set server-side.
const VIDEO_CREATE_FIELDS = [
  'creator', 'creatorHandle', 'creatorDisplayName', 'sourceType', 'category', 'suggestedCategory',
  'title', 'description', 'videoUrl', 'thumbnailUrl', 'sourceImageUrl', 'products',
  'complementaryProducts', 'insights', 'legalConfirmed', 'epnCampId'
];
const VIDEO_ADMIN_PATCH_FIELDS = ['status', 'title', 'products', 'complementaryProducts', 'insights', 'epnCampId', 'category', 'creatorSubscriptionStatus'];
const VIDEO_OWNER_PATCH_FIELDS = ['title', 'products', 'complementaryProducts', 'insights', 'status'];
const VIDEO_AI_REFINE_FIELDS = ['products', 'complementaryProducts'];
const VIDEO_INCREMENT_FIELDS = ['stats.views', 'stats.clicks', 'stats.addToKitCount', 'ratingCount', 'activeBuilders'];

app.get('/api/videos', loadUser, async (req, res) => {
  try {
    const reqUser = (req as any).user;
    const isAdmin = reqUser?.isAdmin === true;
    const requesterEmail = reqUser?.email?.toLowerCase();

    const database = await getDb();
    const query = isAdmin
      ? {}
      : (requesterEmail
          ? { $or: [{ status: 'published' }, { creatorId: requesterEmail }] }
          : { status: 'published' });
    const videos = await database.collection("videos")
      .find(query)
      .sort({ id: -1 })
      .toArray();

    // Creator emails are only visible to the creator themselves and admins.
    // Tip details come from GET /api/videos/:id/creator instead of the list.
    const visible = videos.map((v: any) => {
      const { creatorTipQrUrl, creatorVenmoHandle, ...rest } = v;
      const creatorId = typeof v.creatorId === 'string' ? v.creatorId.toLowerCase() : '';
      if (isAdmin || creatorId === AI_CREATOR_ID || (requesterEmail && creatorId === requesterEmail)) {
        return rest;
      }
      return { ...rest, creatorId: '' };
    });
    res.json(visible);
  } catch (e: any) {
    sendServerError(res, '[GET /api/videos]', e);
  }
});

app.post('/api/videos', requireAuth, async (req, res) => {
  try {
    const reqUser = (req as any).user;
    const id = req.body?.id;
    if (typeof id !== 'number' || !Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid video id" });
    }

    const doc: Record<string, any> = {
      ...pickFields(req.body, VIDEO_CREATE_FIELDS),
      id,
      activeBuilders: 0,
      rating: 0,
      ratingCount: 0,
      stats: { views: 0, clicks: 0, sales: 0, tips: 0, addToKitCount: 0 }
    };

    if (req.body.creatorId === AI_CREATOR_ID) {
      // Existing AI-scan flow: AI hubs publish immediately
      doc.creatorId = AI_CREATOR_ID;
      doc.status = 'published';
    } else {
      doc.creatorId = reqUser.email.toLowerCase();
      doc.creatorSubscriptionStatus = reqUser.subscriptionStatus || 'Free';
      doc.status = (reqUser.isAdmin === true && VIDEO_STATUSES.includes(req.body.status)) ? req.body.status : 'curating';
    }

    const database = await getDb();
    const existing = await database.collection("videos").findOne({ id });
    if (existing) {
      return res.status(409).json({ error: "A video with this id already exists" });
    }

    await database.collection("videos").insertOne(doc);
    res.json({ success: true, id });
  } catch (e: any) {
    sendServerError(res, '[POST /api/videos]', e);
  }
});

app.patch('/api/videos/:id', requireAuth, async (req, res) => {
  try {
    const reqUser = (req as any).user;
    const id = Number(req.params.id);
    const database = await getDb();
    const video = await database.collection("videos").findOne({ id });
    if (!video) {
      return res.status(404).json({ error: "Not found" });
    }

    let updates: Record<string, any>;
    if (reqUser.isAdmin === true) {
      updates = pickFields(req.body, VIDEO_ADMIN_PATCH_FIELDS);
      if (updates.hasOwnProperty('status') && !VIDEO_STATUSES.includes(updates.status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
    } else if (video.creatorId === AI_CREATOR_ID) {
      // Existing "refine" flow: any signed-in maker can improve an AI hub's product list (status is ignored)
      updates = pickFields(req.body, VIDEO_AI_REFINE_FIELDS);
    } else if (canEditVideo(reqUser, video)) {
      updates = pickFields(req.body, VIDEO_OWNER_PATCH_FIELDS);
      if (updates.hasOwnProperty('status') && !['pending_review', 'curating'].includes(updates.status)) {
        return res.status(403).json({ error: "Not allowed" });
      }
    } else {
      return res.status(403).json({ error: "Not allowed" });
    }

    if (Object.keys(updates).length > 0) {
      await database.collection("videos").updateOne({ id }, { $set: updates });
    }
    res.json({ success: true });
  } catch (e: any) {
    sendServerError(res, '[PATCH /api/videos/:id]', e);
  }
});

app.post('/api/videos/:id/increment', incrementLimit, async (req, res) => {
  try {
    const { id } = req.params;
    const { field } = req.body;
    if (!VIDEO_INCREMENT_FIELDS.includes(field)) {
      return res.status(400).json({ error: "Invalid field" });
    }
    const database = await getDb();
    await database.collection("videos").updateOne(
      { id: Number(id) },
      { $inc: { [field]: 1 } }
    );
    res.json({ success: true });
  } catch (e: any) {
    sendServerError(res, '[POST /api/videos/:id/increment]', e);
  }
});

// Public creator card for a video (tip info etc.). Never exposes the creator's email.
app.get('/api/videos/:id/creator', loadUser, async (req, res) => {
  try {
    const reqUser = (req as any).user;
    const id = Number(req.params.id);
    const database = await getDb();
    const video = await database.collection("videos").findOne({ id });
    // Unpublished hubs are only visible to their creator and admins (same rule as the video list)
    const canSeeVideo = video && (video.status === 'published' || reqUser?.isAdmin === true ||
      (typeof video.creatorId === 'string' && reqUser && video.creatorId.toLowerCase() === reqUser.email.toLowerCase()));
    if (!canSeeVideo) {
      return res.status(404).json({ error: "Not found" });
    }
    if (video.creatorId === AI_CREATOR_ID) {
      return res.json({});
    }
    const creator = typeof video.creatorId === 'string'
      ? await database.collection("users").findOne({ email: video.creatorId.toLowerCase() })
      : null;
    if (!creator) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json(publicProfile(creator));
  } catch (e: any) {
    sendServerError(res, '[GET /api/videos/:id/creator]', e);
  }
});

app.post('/api/users/subscription', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const reqUser = (req as any).user;
    const targetEmail = reqUser.email.toLowerCase();
    const database = await getDb();
    
    // Self-serve can only cancel back to Free; paid upgrades go through Stripe webhook
    const allowedStatus = (status === 'Free' || reqUser.isAdmin) ? status : 'Free';

    // Update user
    await database.collection("users").updateOne(
      { email: targetEmail },
      { $set: { subscriptionStatus: allowedStatus } }
    );
    
    // Update all videos by this creator
    await database.collection("videos").updateMany(
      { creatorId: targetEmail },
      { $set: { creatorSubscriptionStatus: allowedStatus } }
    );
    
    res.json({ success: true });
  } catch (e: any) {
    sendServerError(res, '[POST /api/users/subscription]', e);
  }
});

app.get('/api/users/:email', requireAuth, async (req, res) => {
  try {
    const emailParam = (Array.isArray(req.params.email) ? req.params.email[0] : req.params.email)?.toLowerCase();
    if (!emailParam) {
      return res.status(404).json({ error: "Not found" });
    }
    const database = await getDb();
    const doc = await database.collection("users").findOne({ email: emailParam });
    if (!doc) {
      return res.status(404).json({ error: "Not found" });
    }

    const reqUser = (req as any).user;
    if (reqUser.email.toLowerCase() === emailParam || reqUser.isAdmin === true) {
      return res.json(sanitizeUser(doc));
    }
    // Same response as a missing account, so this can't be used to check whether an email is registered
    return res.status(404).json({ error: "Not found" });
  } catch (e: any) {
    sendServerError(res, '[GET /api/users/:email]', e);
  }
});

// Validates user-editable profile text. Only values that actually change are checked, so
// existing (older) values that predate these rules don't block unrelated saves.
function validateProfileFields(updates: Record<string, any>, currentUser: any): string | null {
  const { handle, displayName, bio } = updates;
  if (handle !== undefined && handle !== null && handle !== '' && handle !== currentUser?.handle) {
    if (typeof handle !== 'string' || !/^[a-z0-9_]{3,30}$/.test(handle.toLowerCase())) {
      return "Handle must be 3-30 letters, numbers or underscores";
    }
  }
  if (displayName !== undefined && displayName !== currentUser?.displayName) {
    if (typeof displayName !== 'string' || displayName.length > 60) {
      return "Display name must be 60 characters or fewer";
    }
  }
  if (bio !== undefined && bio !== currentUser?.bio) {
    if (typeof bio !== 'string' || bio.length > 500) {
      return "Bio must be 500 characters or fewer";
    }
  }
  return null;
}

const ALLOWED_USER_UPSERT_FIELDS = [
  'displayName',
  'handle',
  'bio',
  'avatarUrl',
  'tipQrUrl',
  'venmoHandle',
  'favoritedVideoIds',
  'scannedVideoIds',
  'completedProjects',
  'ownedTools',
  'interests',
  'gamificationEnabled',
  'makerXP',
  'makerRank',
  'totalTipsReported',
  'legalConfirmed'
];

app.post('/api/users/upsert', requireAuth, async (req, res) => {
  try {
    const reqUser = (req as any).user;
    const targetEmail = reqUser.email.toLowerCase();
    const database = await getDb();

    const allowedUpdates: Record<string, any> = {};
    for (const key of ALLOWED_USER_UPSERT_FIELDS) {
      if (req.body.hasOwnProperty(key)) {
        allowedUpdates[key] = req.body[key];
      }
    }

    const profileError = validateProfileFields(allowedUpdates, reqUser);
    if (profileError) {
      return res.status(400).json({ error: profileError });
    }

    // Check if handle is taken by someone else
    if (allowedUpdates.handle) {
      const existing = await database.collection("users").findOne({ 
        handle: allowedUpdates.handle.toLowerCase(), 
        email: { $ne: targetEmail } 
      });
      if (existing) {
        return res.status(400).json({ error: "Handle already taken by another maker." });
      }
      allowedUpdates.handle = allowedUpdates.handle.toLowerCase();
    }

    if (Object.keys(allowedUpdates).length > 0) {
      await database.collection("users").updateOne(
        { email: targetEmail },
        { $set: allowedUpdates },
        { upsert: false }
      );
    }

    await logAudit('user_upsert', targetEmail, { changedKeys: Object.keys(allowedUpdates) });

    const updatedDoc = await database.collection("users").findOne({ email: targetEmail });
    res.json({ success: true, user: sanitizeUser(updatedDoc) });
  } catch (e: any) {
    sendServerError(res, "[User Upsert] Fatal Error:", e);
  }
});

app.post('/api/users/update-profile', requireAuth, async (req, res) => {
  try {
    const reqUser = (req as any).user;
    const targetEmail = reqUser.email.toLowerCase();
    const { displayName, handle, bio, avatarUrl } = req.body;
    const profileError = validateProfileFields({ displayName, handle, bio }, reqUser);
    if (profileError) {
        return res.status(400).json({ error: profileError });
    }
    const database = await getDb();
    
    // Check if handle is taken by someone else
    if (handle) {
        const existing = await database.collection("users").findOne({ 
            handle: handle.toLowerCase(), 
            email: { $ne: targetEmail } 
        });
        if (existing) {
            return res.status(400).json({ error: "Handle already taken" });
        }
    }

    await database.collection("users").updateOne(
      { email: targetEmail },
      { $set: { 
          displayName, 
          handle: handle?.toLowerCase(), 
          bio, 
          avatarUrl,
          updatedAt: new Date().toISOString()
        } },
      { upsert: false }
    );

    await logAudit('profile_update', targetEmail, { displayName, handle });
    res.json({ success: true });
  } catch (e: any) {
    sendServerError(res, '[POST /api/users/update-profile]', e);
  }
});

// REPORTING ROUTES
const REPORT_CATEGORIES = ['missing_tool', 'incorrect_step', 'safety_concern', 'out_of_stock', 'other'];

app.post('/api/reports', loadUser, async (req, res, next) => {
  // Beta feedback (BetaNotificationModal) is allowed signed-out; project reports require sign-in.
  if (req.body?.category === 'beta_feedback') return betaFeedbackLimit(req, res, next);
  return requireAuth(req, res, next);
}, async (req, res) => {
  try {
    const reqUser = (req as any).user;
    const { videoId, projectTitle, category, description, reporterEmail } = req.body;

    if (typeof description !== 'string' || !description.trim() || description.length > 2000) {
      return res.status(400).json({ error: "Description is required and must be 2000 characters or fewer." });
    }

    let reportData: Record<string, any>;
    if (category === 'beta_feedback') {
      // reporterEmail here is an optional contact address typed by the user, not an identity
      const contactEmail = isValidEmail(reporterEmail) ? reporterEmail.toLowerCase() : null;
      reportData = {
        category,
        description,
        reporterEmail: reqUser?.email?.toLowerCase() || contactEmail || 'anonymous@watch1do1.com',
        isSignedIn: !!reqUser
      };
    } else {
      if (typeof videoId !== 'number' || !Number.isFinite(videoId)) {
        return res.status(400).json({ error: "Invalid video id" });
      }
      if (!REPORT_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: "Invalid report category" });
      }
      if (projectTitle !== undefined && (typeof projectTitle !== 'string' || projectTitle.length > 200)) {
        return res.status(400).json({ error: "Project title must be 200 characters or fewer." });
      }
      reportData = {
        videoId,
        projectTitle: projectTitle || '',
        category,
        description,
        reporterEmail: reqUser.email.toLowerCase()
      };
    }

    reportData.id = crypto.randomUUID();
    reportData.timestamp = new Date().toISOString();
    reportData.status = 'pending';

    const database = await getDb();
    await database.collection("reports").insertOne(reportData);
    await logAudit('project_reported', reportData.reporterEmail, { videoId: reportData.videoId, category: reportData.category });
    res.json({ success: true, id: reportData.id });
  } catch (e: any) {
    sendServerError(res, '[POST /api/reports]', e);
  }
});

app.get('/api/admin/reports', requireAdmin, async (req, res) => {
    try {
        const database = await getDb();
        const reports = await database.collection("reports").find({}).sort({ timestamp: -1 }).toArray();
        res.json(reports);
    } catch (e: any) {
        sendServerError(res, '[GET /api/admin/reports]', e);
    }
});

app.patch('/api/admin/reports/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['pending', 'resolved', 'dismissed'].includes(status)) {
            return res.status(400).json({ error: "Status must be pending, resolved, or dismissed" });
        }
        const database = await getDb();
        await database.collection("reports").updateOne({ id }, { $set: { status } });
        res.json({ success: true });
    } catch (e: any) {
        sendServerError(res, '[PATCH /api/admin/reports/:id]', e);
    }
});

app.get('/api/admin/audit-logs', requireAdmin, async (req, res) => {
    try {
        const database = await getDb();
        const logs = await database.collection("audit_logs").find({}).sort({ timestamp: -1 }).limit(100).toArray();
        res.json(logs);
    } catch (e: any) {
        sendServerError(res, '[GET /api/admin/audit-logs]', e);
    }
});

app.get('/api/admin/system-status', requireAdmin, async (req, res) => {
    try {
        const database = await getDb();
        const aiLogs = database ? await database.collection("ai_usage_logs").find({}).toArray() : [];

        const totalAiCalls = aiLogs.length;
        const totalAiCost = aiLogs.reduce((sum: number, log: any) => sum + (log.estimatedCost || 0), 0);
        
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

        const dailyAiLogs = aiLogs.filter((log: any) => log.timestamp >= oneDayAgo);
        const weeklyAiLogs = aiLogs.filter((log: any) => log.timestamp >= oneWeekAgo);

        const dailyCost = dailyAiLogs.reduce((sum: number, log: any) => sum + (log.estimatedCost || 0), 0);
        const weeklyCost = weeklyAiLogs.reduce((sum: number, log: any) => sum + (log.estimatedCost || 0), 0);
        
        const modelCounts: Record<string, number> = {};
        aiLogs.forEach((log: any) => {
          modelCounts[log.model] = (modelCounts[log.model] || 0) + 1;
        });

        const recentAiCalls = database ? await database.collection("ai_usage_logs")
          .find({})
          .sort({ timestamp: -1 })
          .limit(10)
          .toArray() : [];

        const status = {
            dbConnected: !!database,
            mongoUriOk: !!process.env.MONGODB_URI,
            stripeOk: !!process.env.STRIPE_SECRET_KEY,
            resendOk: !!process.env.RESEND_API_KEY,
            ebayOk: !!process.env.EBAY_CLIENT_ID,
            geminiOk: !!process.env.GEMINI_API_KEY,
            uptime: process.uptime(),
            version: "1.2.0",
            totalAiCalls,
            totalAiCost,
            dailyCost,
            weeklyCost,
            dailyLimit: AI_DAILY_LIMIT_USD,
            dailyLimitExceeded: dailyCost >= AI_DAILY_LIMIT_USD,
            modelCounts,
            recentAiCalls
        };
        res.json(status);
    } catch (e: any) {
        sendServerError(res, '[GET /api/admin/system-status]', e);
    }
});

const EVENT_TYPES = ['video_view', 'product_click', 'add_to_kit', 'source_redirect', 'feature_use', 'search'];
const EVENT_FIELDS = ['type', 'ts', 'videoId', 'category', 'retailer', 'featureName', 'partner', 'value', 'metadata'];

// Analytics reads: admins, verified partners, and paid creators (same gate as AdminDashboard)
function requireAnalyticsAccess(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user;
  if (user?.isAdmin === true || user?.isVerifiedPartner === true || ['Plus', 'Pro', 'Studio'].includes(user?.subscriptionStatus)) {
    return next();
  }
  return res.status(403).json({ error: "Not allowed" });
}

app.post('/api/events', loadUser, async (req, res) => {
  try {
    const event = pickFields(req.body, EVENT_FIELDS);
    if (!EVENT_TYPES.includes(event.type)) {
      return res.status(400).json({ error: "Invalid event type" });
    }
    if (event.metadata !== undefined) {
      try {
        if (JSON.stringify(event.metadata).length > 2000) delete event.metadata;
      } catch {
        delete event.metadata;
      }
    }
    event.id = crypto.randomUUID();
    event.timestamp = new Date().toISOString();
    event.userId = (req as any).user?.email?.toLowerCase() || null;

    const database = await getDb();
    await database.collection("events").insertOne(event);
    res.json({ success: true });
  } catch (e: any) {
    sendServerError(res, '[POST /api/events]', e);
  }
});

app.get('/api/events', requireAuth, requireAnalyticsAccess, async (req, res) => {
  try {
    const database = await getDb();
    const events = await database.collection("events")
      .find({})
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();
    res.json(events);
  } catch (e: any) {
    sendServerError(res, '[GET /api/events]', e);
  }
});

// New: Purchases Collection
app.get('/api/purchases', requireAuth, requireAnalyticsAccess, async (req, res) => {
    try {
      const database = await getDb();
      const purchases = await database.collection("purchases")
        .find({})
        .sort({ date: -1 })
        .toArray();
      res.json(purchases);
    } catch (e: any) {
      sendServerError(res, '[GET /api/purchases]', e);
    }
});

app.post('/api/purchases', requireAuth, async (req, res) => {
    try {
      const purchase = pickFields(req.body, ['products', 'totalAmount', 'partner', 'videoId']);
      if (purchase.products !== undefined && !Array.isArray(purchase.products)) {
        return res.status(400).json({ error: "Invalid products" });
      }
      if (purchase.totalAmount !== undefined && (typeof purchase.totalAmount?.amount !== 'number' || typeof purchase.totalAmount?.currency !== 'string')) {
        return res.status(400).json({ error: "Invalid total amount" });
      }
      purchase.id = crypto.randomUUID();
      purchase.date = new Date().toISOString();
      purchase.userId = (req as any).user.email.toLowerCase();

      const database = await getDb();
      await database.collection("purchases").insertOne(purchase);
      res.json({ success: true, id: purchase.id });
    } catch (e: any) {
      sendServerError(res, '[POST /api/purchases]', e);
    }
});

app.delete('/api/videos/:id', requireAuth, async (req, res) => {
  try {
    const reqUser = (req as any).user;
    const id = Number(req.params.id);
    const database = await getDb();
    const video = await database.collection("videos").findOne({ id });
    if (!video) {
      return res.status(404).json({ error: "Not found" });
    }
    const isOwner = typeof video.creatorId === 'string' && video.creatorId.toLowerCase() === reqUser.email.toLowerCase();
    if (reqUser.isAdmin !== true && !isOwner) {
      return res.status(403).json({ error: "Not allowed" });
    }
    await database.collection("videos").deleteOne({ id });
    res.json({ success: true });
  } catch (e: any) {
    sendServerError(res, '[DELETE /api/videos/:id]', e);
  }
});

// JSON error handler for body-parser and any error forwarded by Express.
// Real errors are logged; clients only get a generic message.
app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) return next(err);
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: "Request is too large." });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: "Invalid JSON body." });
  }
  sendServerError(res, `[API Error] ${req.method} ${req.originalUrl}`, err);
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*all', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// App Listener
if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;
