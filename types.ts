
export type VideoStatus = 'curating' | 'pending_review' | 'published' | 'rejected';
export type VideoSourceType = 'internal' | 'external';

export type SubscriptionStatus = 'Free' | 'Plus' | 'Pro' | 'Studio';
export type VerifiedStatus = 'none' | 'pending' | 'verified' | 'rejected';

export type Money = {
  amount: number;
  currency: string;
};

export type MakerRank = 
  | 'Apprentice' 
  | 'Studio Lead' 
  | 'Senior Builder' 
  | 'Master Maker' 
  | 'Grand Architect';

export type ProjectCategory = 
  | 'Home Improvement' 
  | 'DIY Crafts' 
  | 'Cooking & Kitchen' 
  | 'Gardening' 
  | 'Tech & Gadgets' 
  | 'Fitness & Sports' 
  | 'Automotive' 
  | 'Fashion & Beauty' 
  | 'Kids & Toys' 
  | 'Survival & Outdoors' 
  | 'Music' 
  | 'Pets & Animal Care'
  | 'Art & Photography' 
  | 'Hobbies'
  | 'Other';

export interface Merchant {
  id: string;
  name: string;
  type: 'affiliate_only' | 'marketplace_capable';
  checkoutMode: 'redirect' | 'platform_checkout';
  payoutCapable: boolean;
  verificationStatus: 'unverified' | 'pending' | 'verified';
  affiliateNetwork?: string;
}

export interface MarketplaceCapabilities {
  unifiedCheckout: boolean;
  splitPayouts: boolean;
  platformFees: boolean;
}

export interface PartnerMeta {
  id: string;
  name: string;
  type: 'affiliate' | 'merchant';
}

/** Standardized Event Tracking for Funnel Analysis */
export interface AppEvent {
  id: string;
  type: 'video_view' | 'product_click' | 'add_to_kit' | 'source_redirect' | 'feature_use' | 'search';
  ts: string;
  videoId?: number;
  userId?: string;
  category?: ProjectCategory | string;
  retailer?: string;
  featureName?: string;
  partner?: PartnerMeta;
  value?: Money;
  metadata?: Record<string, any>;
  timestamp: string; // Legacy field for db compatibility
}

export interface Product {
  id: string; // Mandatory unique ID to prevent multi-retailer collision
  name: string;
  price: Money;
  lastCheckedPrice?: Money;
  available?: boolean;
  stockStatus?: 'in-stock' | 'low' | 'out' | 'unknown';
  description: string;
  imageUrl: string;
  retailer: string;
  purchaseUrl: string; // This will be the affiliate redirect URL
  evaluation: string;
  isPartnerProduct: boolean;
  isCreatorDeclared?: boolean;
  creatorAffiliateUrl?: string;
  sourceType: 'inferred' | 'manual' | 'direct' | 'verified';
  merchantId?: string;
  merchantName?: string;
  merchantType?: 'affiliate_only' | 'marketplace_capable';
  checkoutMode?: 'redirect' | 'platform_checkout';
  payoutCapable?: boolean;
  confidence?: number;
  technicalSpecs?: string;
  reviewsUrl?: string;
  condition?: string;
  seller?: string;
}

export interface ProjectCostEstimate {
    budgetName: string;
    budgetTotal: string;
    proName: string;
    proTotal: string;
    description: string;
}

export interface SafetyItem {
    task: string;
    precaution: string;
    severity: 'low' | 'medium' | 'high';
}

export interface ProjectInsights {
  costEstimate: ProjectCostEstimate;
  safetyProtocol: SafetyItem[];
  difficulty: 'Beginner' | 'Intermediate' | 'Expert';
  timeEstimate: string;
  toolsRequired: string[];
}

export interface Video {
  id: number;
  creator: string;
  creatorId: string;
  creatorSubscriptionStatus?: SubscriptionStatus;
  status: VideoStatus;
  sourceType?: VideoSourceType;
  category: ProjectCategory;
  suggestedCategory?: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl: string;
  sourceImageUrl?: string;
  creatorHandle?: string;
  creatorDisplayName?: string;
  products: Product[];
  complementaryProducts: Product[];
  insights: ProjectInsights;
  activeBuilders: number;
  rating: number;
  ratingCount: number;
  epnCampId?: string;
  creatorTipQrUrl?: string;
  creatorVenmoHandle?: string;
  legalConfirmed?: boolean;
  hasIdentitySlate?: boolean;
  slateVerificationDate?: string;
  stats?: {
    views: number;
    clicks: number;
    sales: number;
    tips: number;
    addToKitCount: number;
  };
}

export interface Purchase {
  id: string;
  date: string;
  products: Product[];
  totalAmount: Money;
  partner?: PartnerMeta;
  videoId?: number;
}

export interface CompletedProject {
    videoId: number;
    projectTitle: string;
    completionDate: string;
    resultImageUrl: string;
    note: string;
}

export interface User {
  email: string;
  displayName: string;
  avatarUrl?: string;
  subscriptionStatus: SubscriptionStatus;
  bio: string;
  favoritedVideoIds: number[];
  scannedVideoIds?: number[];
  purchaseHistory: Purchase[];
  completedProjects: CompletedProject[];
  isAdmin: boolean;
  makerXP: number;
  makerRank: MakerRank;
  pendingBalance: number;
  totalTipsReported: number;
  isOver18: boolean;
  stripeConnected: boolean;
  verifiedStatus?: VerifiedStatus;
  isVerifiedPartner?: boolean;
  isPartner?: boolean; // Convenience flag for UI
  legalConfirmed?: boolean;
  gamificationEnabled: boolean;
  interests?: ProjectCategory[];
  ownedTools?: string[];
  tipQrUrl?: string;
  venmoHandle?: string;
  handle?: string; // Unique maker handle (e.g. @maker_123)
  // Enterprise Fields
  company?: string;
  partnerId?: string;
  lastSyncAt?: string;
  catalogCount?: number;
  password?: string; // Hashed password
  resetToken?: string;
  resetTokenExpiry?: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export type ReportCategory = 'missing_tool' | 'incorrect_step' | 'safety_concern' | 'out_of_stock' | 'other';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface ProjectReport {
  id: string;
  videoId: number;
  projectTitle: string;
  reporterEmail: string;
  category: ReportCategory;
  description: string;
  timestamp: string;
  status: ReportStatus;
}

export interface AuditEntry {
  id: string;
  action: string;
  userId: string;
  userEmail: string;
  metadata: Record<string, any>;
  timestamp: string;
}

export interface SystemStatus {
  dbConnected: boolean;
  mongoUriOk: boolean;
  stripeOk: boolean;
  resendOk: boolean;
  ebayOk: boolean;
  geminiOk: boolean;
  uptime: number;
  version: string;
}

export const UploadType = {
  YOUTUBE: 'youtube',
  IMAGE: 'image',
  URL: 'url',
  CAMERA: 'camera'
} as const;

export type UploadType = (typeof UploadType)[keyof typeof UploadType];
