
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
  constructEbayAffiliateUrl 
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

app.use(express.json({ limit: '50mb' })); // Increase limit for images

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
    email: user.email,
    displayName: user.displayName || '',
    handle: user.handle || '',
    bio: user.bio || '',
    avatarUrl: user.avatarUrl || '',
    tipQrUrl: user.tipQrUrl || '',
    venmoHandle: user.venmoHandle || '',
    makerRank: user.makerRank || 'Apprentice',
    isVerifiedPartner: !!user.isVerifiedPartner,
    subscriptionStatus: user.subscriptionStatus || 'Free'
  };
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
app.post('/api/stripe/create-checkout-session', async (req, res) => {
  try {
    const { tier, email, interval } = req.body;
    
    const isAnnual = interval === 'annual';
    const priceIds: Record<string, string | undefined> = {
      Plus: isAnnual ? process.env.STRIPE_PRICE_PLUS_ANNUAL : process.env.STRIPE_PRICE_PLUS,
      Pro: isAnnual ? process.env.STRIPE_PRICE_PRO_ANNUAL : process.env.STRIPE_PRICE_PRO,
      Studio: isAnnual ? process.env.STRIPE_PRICE_STUDIO_ANNUAL : process.env.STRIPE_PRICE_STUDIO,
    };

    const priceId = priceIds[tier];
    if (!priceId) {
      // Fallback for development if keys aren't set
      return res.json({ url: `https://checkout.stripe.com/pay/dummy_${tier.toLowerCase()}` });
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
    console.error("[Stripe Error]", e);
    res.status(500).json({ error: e.message });
  }
});

// Webhook for subscription updates
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return res.status(400).send('Webhook Error: Missing signature or secret');
  }

  let event;

  try {
    event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const database = await getDb();

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as any;
      const { email: sessionEmail, tier } = session.metadata;
      
      // Calculate XP reward based on tier
      let xpReward = 0;
      if (tier === 'Plus') xpReward = 500;
      else if (tier === 'Pro') xpReward = 1500;
      else if (tier === 'Studio') xpReward = 3000;

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
    case 'customer.subscription.deleted':
      const subscription = event.data.object as any;
      // In a real app we'd look up email by customer ID
      // But for this purpose let's assume metadata or similar works or we just log it
      // For testing/mocking in this environment we can use the manual handleCancel if needed
      console.log(`Subscription deleted: ${subscription.id}`);
      break;
  }

  res.json({ received: true });
});

const RESEND_SENDER = 'Watch1Do1 <security@watch1do1.com>';

// --- AUTHENTICATION ROUTES ---

app.post('/api/auth/signup', async (req, res) => {
    try {
        if (!hasValidSessionSecret()) {
            return res.status(500).json({ error: "Server misconfigured" });
        }
        const { email, password, isOver18 } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Missing identity data" });
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
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        if (!hasValidSessionSecret()) {
            return res.status(500).json({ error: "Server misconfigured" });
        }
        const { email, password } = req.body;
        if (!email || !password) {
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
        res.status(500).json({ error: e.message });
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
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/logout', (req, res) => {
    clearSessionCookie(res);
    res.json({ success: true });
});

app.post('/api/auth/forgot-password', async (req, res) => {
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
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;
        if (!email || !token || !newPassword) {
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
        res.status(500).json({ error: e.message });
    }
});

// --- ADMIN MANAGEMENT ROUTES ---

app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
        const database = await getDb();
        const users = await database.collection("users").find({}).toArray();
        res.json(users.map(sanitizeUser));
    } catch (e: any) {
        res.status(500).json({ error: e.message });
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
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        const resendKey = process.env.RESEND_API_KEY;
        
        console.log(`[Contact] Transmission initialized from ${email}`);

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
                subject: `New Workshop Inquiry: ${subject}`,
                html: `
                    <div style="font-family: sans-serif; background: #020617; color: #f8fafc; padding: 40px; border-radius: 24px;">
                        <h2 style="color: #7D8FED; margin-top: 0;">New Workshop Inquiry</h2>
                        <p style="margin-bottom: 20px; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">
                            <strong>From:</strong> ${name} (&lt;${email}&gt;)<br/>
                            <strong>Vector:</strong> ${subject}
                        </p>
                        <div style="background: #0f172a; padding: 25px; border-radius: 16px; border: 1px solid #1e293b;">
                            <p style="white-space: pre-wrap; margin: 0; line-height: 1.6; color: #94a3b8;">${message}</p>
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
        console.error("[Contact] Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// AI ROUTES
app.post('/api/ai/products/text', async (req, res) => {
  try {
    const { text, category } = req.body;
    const products = await generateProductsFromText(text, category);
    await logAiUsage('/api/ai/products/text', 'gemini-3.5-flash', 0.00056, category);
    res.json(products);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ai/products/images', async (req, res) => {
  try {
    const { images, mimeType, category } = req.body;
    const products = await generateProductsFromImages(images, mimeType, category);
    await logAiUsage('/api/ai/products/images', 'gemini-3.5-flash', 0.00058, category);
    res.json(products);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ai/products/url', async (req, res) => {
  try {
    const { url, category } = req.body;
    const products = await generateProductsFromUrl(url, category);
    await logAiUsage('/api/ai/products/url', 'gemini-3.5-flash', 0.00062, category);
    res.json(products);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ai/products/deepdive', async (req, res) => {
    try {
        const { title, existing, category } = req.body;
        const products = await generateDeepDiveProducts(title, existing, category);
        await logAiUsage('/api/ai/products/deepdive', 'gemini-3.5-flash', 0.00056, category);
        res.json(products);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/ai/products/complementary', async (req, res) => {
  try {
    const { title, existing, category } = req.body;
    const products = await generateComplementaryProducts(title, existing, category);
    await logAiUsage('/api/ai/products/complementary', 'gemini-3.5-flash', 0.00045, category);
    res.json(products);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ai/insights', async (req, res) => {
  try {
    const { title, products, category } = req.body;
    const insights = await generateV3ProjectInsights(title, products, category);
    await logAiUsage('/api/ai/insights', 'gemini-3.1-pro-preview', 0.01375, category);
    res.json(insights);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ai/search', async (req, res) => {
  try {
    const { query } = req.body;
    const products = await searchSpecificProduct(query);
    await logAiUsage('/api/ai/search', 'gemini-3.5-flash', 0.00056);
    res.json(products);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ai/revalidate', async (req, res) => {
  try {
    const { product } = req.body;
    const update = await revalidateProductAvailability(product);
    await logAiUsage('/api/ai/revalidate', 'gemini-3.5-flash', 0.00045, product?.category);
    res.json(update);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ai/chat', async (req, res) => {
  try {
    const { videoTitle, products, message, history } = req.body;

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
    console.error("[Server Chat Error]:", e);
    if (!res.headersSent) {
      res.status(500).json({ error: e.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
      res.end();
    }
  }
});

// EBAY ROUTES
app.get('/api/ebay/search', async (req, res) => {
  try {
    const { q, limit } = req.query;
    const items = await searchEbayItems(q as string, limit ? Number(limit) : 10);
    
    // Normalize to internal Product type
    const normalized = items.map((item: any) => ({
      id: `ebay-${item.itemId}`,
      name: item.title,
      price: {
        amount: parseFloat(item.price.value),
        currency: item.price.currency
      },
      imageUrl: item.image?.imageUrl || 'https://picsum.photos/seed/ebay/200/200',
      purchaseUrl: constructEbayAffiliateUrl(item.itemId),
      retailer: 'eBay',
      isAvailable: true,
      stockStatus: 'in-stock',
      condition: item.condition,
      seller: item.seller?.username,
      description: item.shortDescription || item.title,
      evaluation: `Verified eBay listing: ${item.condition || 'New'}. Seller: ${item.seller?.username || 'Unknown'}.`,
      isPartnerProduct: false,
      sourceType: 'verified'
    }));
    
    res.json(normalized);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/ebay/item/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const item = await getEbayItem(id);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
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
  console.log("Challenge Code:", challengeCode);
  console.log("Verification Token (exists):", !!verificationToken);
  console.log("Calculated Endpoint URL:", endpoint);

  if (!challengeCode || !verificationToken) {
    console.error("Missing challengeCode or verificationToken");
    return res.status(200).json({ 
      error: `Missing parameters. To verify, add ?challenge_code=test to the ${endpoint} URL.`,
      verificationToken: verificationToken ? "Set (Hidden for security)" : "Missing",
      calculatedEndpoint: endpoint
    });
  }

  try {
    const hash = crypto.createHash('sha256');
    hash.update(challengeCode);
    hash.update(verificationToken);
    hash.update(endpoint);
    const responseHash = hash.digest('hex');

    console.log("Generated Hash:", responseHash);

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

app.get('/api/videos', async (req, res) => {
  try {
    const database = await getDb();
    const videos = await database.collection("videos")
      .find({})
      .sort({ id: -1 })
      .toArray();
    res.json(videos);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/videos', async (req, res) => {
  try {
    const database = await getDb();
    const result = await database.collection("videos").insertOne(req.body);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/videos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const database = await getDb();
    const result = await database.collection("videos").updateOne(
      { id: Number(id) },
      { $set: req.body }
    );
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/videos/:id/increment', async (req, res) => {
  try {
    const { id } = req.params;
    const { field } = req.body;
    const database = await getDb();
    const result = await database.collection("videos").updateOne(
      { id: Number(id) },
      { $inc: { [field]: 1 } }
    );
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
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
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/users/:email', loadUser, async (req, res) => {
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
    if (reqUser && (reqUser.email.toLowerCase() === emailParam || reqUser.isAdmin === true)) {
      return res.json(sanitizeUser(doc));
    }
    return res.json(publicProfile(doc));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

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
    console.error("[User Upsert] Fatal Error:", e);
    res.status(500).json({ 
      error: e.message,
      details: "Ensure MONGODB_URI is correctly configured in your environment variables."
    });
  }
});

app.post('/api/users/update-profile', requireAuth, async (req, res) => {
  try {
    const reqUser = (req as any).user;
    const targetEmail = reqUser.email.toLowerCase();
    const { displayName, handle, bio, avatarUrl } = req.body;
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
    res.status(500).json({ error: e.message });
  }
});

// REPORTING ROUTES
app.post('/api/reports', async (req, res) => {
  try {
    const database = await getDb();
    const reportData = {
        ...req.body,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        status: 'pending'
    };
    const result = await database.collection("reports").insertOne(reportData);
    await logAudit('project_reported', reportData.reporterEmail, { videoId: reportData.videoId, category: reportData.category });
    res.json({ success: true, id: reportData.id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/reports', requireAdmin, async (req, res) => {
    try {
        const database = await getDb();
        const reports = await database.collection("reports").find({}).sort({ timestamp: -1 }).toArray();
        res.json(reports);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
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
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/admin/audit-logs', requireAdmin, async (req, res) => {
    try {
        const database = await getDb();
        const logs = await database.collection("audit_logs").find({}).sort({ timestamp: -1 }).limit(100).toArray();
        res.json(logs);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
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
            dailyLimit: 20.0,
            dailyLimitExceeded: dailyCost > 20.0,
            modelCounts,
            recentAiCalls
        };
        res.json(status);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/events', async (req, res) => {
  try {
    const database = await getDb();
    const result = await database.collection("events").insertOne(req.body);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const database = await getDb();
    const events = await database.collection("events")
      .find({})
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();
    res.json(events);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// New: Purchases Collection
app.get('/api/purchases', async (req, res) => {
    try {
      const database = await getDb();
      const purchases = await database.collection("purchases")
        .find({})
        .sort({ date: -1 })
        .toArray();
      res.json(purchases);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
});

app.post('/api/purchases', async (req, res) => {
    try {
      const database = await getDb();
      const result = await database.collection("purchases").insertOne(req.body);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
});

app.delete('/api/videos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const database = await getDb();
    const result = await database.collection("videos").deleteOne({ id: Number(id) });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
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
