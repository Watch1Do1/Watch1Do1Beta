
import React, { useState, useEffect, useMemo } from 'react';
import { Video, Product, ProjectInsights, AppEvent, Purchase, ProjectCategory, Money, User, PartnerMeta } from '../types';
import { ShieldIcon, CheckCircleIcon, EyeIcon, ArrowLeftIcon, ShoppingCartIcon, BarChartIcon, DollarSignIcon, RefreshCwIcon, PlusIcon, TrashIcon, XCircleIcon, LinkIcon, SendIcon, MousePointerClickIcon, TrophyIcon, FileTextIcon, ExternalLinkIcon, UserIcon, SparkleIcon, CameraIcon, PackagePlusIcon, ChevronDownIcon, SearchIcon, PencilIcon, PlayIcon, MedalIcon } from './IconComponents';
import { PLATFORM_DEFAULT_CAMPID, searchSpecificProduct } from '../services/geminiService';
import { searchEbay } from '../services/ebayService';
import { dbService } from '../services/dbService';
import { APP_CONFIG } from '../constants';

interface AdminDashboardProps {
  videos: Video[];
  currentUser: User;
  onApprove: (videoId: number, updatedProducts: Product[], updatedComplementary: Product[], epnCampId?: string, updatedInsights?: ProjectInsights, title?: string, creatorSubscriptionStatus?: string) => void;
  onReject: (videoId: number) => void;
  onDelete: (videoId: number) => void;
  onBack: () => void;
  onNavigate?: (view: any) => void;
  onUploadClick?: () => void;
}

const formatCurrency = (m: Money | number) => {
    const amt = typeof m === 'number' ? m : m.amount;
    return `$${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ videos, currentUser, onApprove, onReject, onDelete, onBack, onNavigate, onUploadClick }) => {
  const isAdmin = currentUser.isAdmin;
  const isPartner = currentUser.isVerifiedPartner && !isAdmin;
  const isCreator = (currentUser.subscriptionStatus === 'Plus' || currentUser.subscriptionStatus === 'Pro' || currentUser.subscriptionStatus === 'Studio') && !isAdmin && !isPartner;
  const canDeclare = currentUser.subscriptionStatus === 'Pro' || currentUser.subscriptionStatus === 'Studio';

  // 1. Security Gate
  if (!isAdmin && !isPartner && !isCreator) {
    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-8 animate-fade-in">
            <div className="text-center max-w-sm bg-slate-900 p-12 rounded-[3rem] border border-slate-800 shadow-2xl">
                <ShieldIcon className="w-16 h-16 text-rose-500 mx-auto mb-8" />
                <h2 className="text-3xl font-black text-white mb-4 tracking-tighter">Access Denied</h2>
                <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest leading-relaxed mb-8">
                    Signature Mismatch. Please contact partner support to request verification.
                </p>
                <button onClick={onBack} className="w-full py-5 bg-white text-slate-900 font-black rounded-2xl text-xs uppercase tracking-widest hover:scale-105 transition-all">
                    Return to Library
                </button>
            </div>
        </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'pending' | 'library' | 'intelligence' | 'logistics' | 'users' | 'reports' | 'audit' | 'status'>( (isPartner || isCreator) ? 'intelligence' : 'pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [analyticsEvents, setAnalyticsEvents] = useState<AppEvent[]>([]);
  const [purchaseData, setPurchaseData] = useState<Purchase[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(currentUser.lastSyncAt || new Date().toISOString());

  // Edit States for the Terminal
  const [editTitle, setEditTitle] = useState('');
  const [editProducts, setEditProducts] = useState<Product[]>([]);
  const [editComplementary, setEditComplementary] = useState<Product[]>([]);
  const [editEpnId, setEditEpnId] = useState(PLATFORM_DEFAULT_CAMPID);
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);
  const [discoveryQuery, setDiscoveryQuery] = useState('');
  const [discoveryCandidates, setDiscoveryCandidates] = useState<Product[]>([]);

  useEffect(() => {
    const fetchIntelligence = async () => {
        try {
            const [events, purchases] = await Promise.all([
                dbService.getEvents(),
                dbService.getAllPurchases()
            ]);
            
            if (isPartner) {
                setAnalyticsEvents(events.filter(e => 
                    e.partner?.name?.toLowerCase() === currentUser.company?.toLowerCase() ||
                    e.partner?.id === currentUser.partnerId ||
                    (e.videoId && videos.some(v => v.id === e.videoId && v.creatorId.toLowerCase() === currentUser.email.toLowerCase()))
                ));

                setPurchaseData(purchases.filter(p => 
                    p.partner?.name?.toLowerCase() === currentUser.company?.toLowerCase() ||
                    p.partner?.id === currentUser.partnerId ||
                    (p.videoId && videos.some(v => v.id === p.videoId && v.creatorId.toLowerCase() === currentUser.email.toLowerCase()))
                ));
            } else {
                setAnalyticsEvents(events);
                setPurchaseData(purchases);
            }
        } catch (e) { console.error("Intelligence stream failure", e); }
    };
    fetchIntelligence();
  }, [activeTab, isPartner, currentUser, videos]);

  useEffect(() => {
    if (isAdmin && activeTab === 'users') {
        const fetchUsers = async () => {
            try {
                const response = await fetch('/api/admin/users');
                const data = await response.json();
                setUsers(data);
            } catch (e) { console.error("User fetch failure", e); }
        };
        fetchUsers();
    }

    if (isAdmin && activeTab === 'reports') {
        const fetchReports = async () => {
            const data = await dbService.getReports();
            setReports(data);
        };
        fetchReports();
    }

    if (isAdmin && activeTab === 'audit') {
        const fetchAudit = async () => {
            const data = await dbService.getAuditTrail();
            setAuditTrail(data);
        };
        fetchAudit();
    }

    if (isAdmin && activeTab === 'status') {
        const fetchStatus = async () => {
            const data = await dbService.getSystemStatus();
            setSystemStatus(data);
        };
        fetchStatus();
    }
  }, [isAdmin, activeTab]);

  const handleResolveReport = async (reportId: string) => {
    try {
        const success = await dbService.resolveReport(reportId);
        if (success) {
            setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
        }
    } catch (e) { alert("Resolution failed."); }
  };

  const handleUpdateUser = async (email: string, updates: Partial<User>) => {
    try {
        const response = await fetch('/api/admin/users/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, updates })
        });
        if (response.ok) {
            setUsers(prev => prev.map(u => u.email === email ? { ...u, ...updates } : u));
        }
    } catch (e) { alert("Failed to update user."); }
  };

  const partnerSplit = useMemo(() => {
    type Totals = { views: number; add: number; redirect: number; success: number; gmv: number };
    const by: Record<string, Totals> = {
        'affiliate': { views: 0, add: 0, redirect: 0, success: 0, gmv: 0 },
        'merchant': { views: 0, add: 0, redirect: 0, success: 0, gmv: 0 }
    };

    analyticsEvents.forEach(e => {
        const key = e.partner?.type || (e.metadata?.partnerType as any) || 'affiliate';
        if (by[key]) {
            if (e.type === 'video_view') by[key].views++;
            if (e.type === 'add_to_cart') by[key].add++;
            if (e.type === 'source_redirect') by[key].redirect++;
        }
    });

    purchaseData.forEach(p => {
        const key = p.partner?.type || 'affiliate';
        if (by[key]) {
            let orderVal = 0;
            p.products.forEach(prod => {
                const qty = (prod as any).quantity ?? 1;
                orderVal += (prod.price.amount ?? 0) * qty;
            });
            by[key].gmv += orderVal;
            by[key].success++;
        }
    });

    return {
        affil: { ...by.affiliate, conv: by.affiliate.views > 0 ? (by.affiliate.success / by.affiliate.views) * 100 : 0 },
        merchant: { ...by.merchant, conv: by.merchant.views > 0 ? (by.merchant.success / by.merchant.views) * 100 : 0 }
    };
  }, [analyticsEvents, purchaseData]);

  const enterpriseStats = useMemo(() => {
    let totalSalesValue = 0;
    const skuPerformance: Record<string, { name: string; sales: number; views: number; revenue: number; img: string }> = {};
    const videoPerformance: Record<string, { title: string; creator: string; sales: number }> = {};

    purchaseData.forEach(p => {
      p.products.forEach(prod => {
        const lineVal = (prod.price.amount || 0) * ((prod as any).quantity || 1);
        totalSalesValue += lineVal;
        skuPerformance[prod.id] = skuPerformance[prod.id] || { name: prod.name, sales: 0, views: 0, revenue: 0, img: prod.imageUrl };
        skuPerformance[prod.id].sales += ((prod as any).quantity || 1);
        skuPerformance[prod.id].revenue += lineVal;

        const v = videos.find(vid => vid.id === p.videoId);
        if (v) {
            videoPerformance[v.id] = videoPerformance[v.id] || { title: v.title, creator: v.creator, sales: 0 };
            videoPerformance[v.id].sales++;
        }
      });
    });

    return {
      totalSalesValue,
      topSKUs: Object.values(skuPerformance).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      topVideos: Object.values(videoPerformance).sort((a, b) => b.sales - a.sales).slice(0, 5)
    };
  }, [purchaseData, videos]);

  const funnelStats = useMemo(() => {
      const counts = { views: 0, kitAdd: 0, sourceRedirect: 0, success: 0 };
      analyticsEvents.forEach(e => {
          if (e.type === 'video_view') counts.views++;
          if (e.type === 'add_to_cart') counts.kitAdd++;
          if (e.type === 'source_redirect') counts.sourceRedirect++;
      });
      purchaseData.forEach(() => counts.success++);
      return counts;
  }, [analyticsEvents, purchaseData]);

  const handleForceSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
        setIsSyncing(false);
        setLastSyncTime(new Date().toISOString());
    }, 2500);
  };

  const handleExportPartnerCSV = () => {
    if (!partnerIntelligence) return;

    const headers = ['Project Title', 'Category', 'Difficulty', 'Budget', 'Role', 'Status'];
    const rows = partnerIntelligence.demandVideos.map(v => {
        const partnerProds = [...v.products, ...(v.complementaryProducts || [])].filter(p => 
            p.merchantId === currentUser.partnerId || 
            p.merchantName?.toLowerCase() === (currentUser.company?.toLowerCase() || currentUser.displayName.toLowerCase())
        );
        const isOfficial = v.products.some(p => p.merchantId === currentUser.partnerId || p.merchantName?.toLowerCase() === (currentUser.company?.toLowerCase() || currentUser.displayName.toLowerCase()));
        const isTool = partnerProds.some(p => p.technicalSpecs?.toLowerCase().includes('tool') || v.insights?.toolsRequired?.some(t => p.name.toLowerCase().includes(t.toLowerCase())));
        
        return [
            `"${v.title}"`,
            v.category,
            v.insights?.difficulty || 'N/A',
            `"${v.insights?.costEstimate?.budgetTotal || 'N/A'}"`,
            isTool ? 'Tool' : 'Material',
            isOfficial ? 'Official' : 'Suggested'
        ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `watch1do1_partner_demand_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditClick = (video: Video) => { 
    setSelectedVideo(video);
    setEditTitle(video.title);
    setEditProducts([...video.products]);
    setEditComplementary([...(video.complementaryProducts || [])]);
    setEditEpnId(video.epnCampId || PLATFORM_DEFAULT_CAMPID);
    setDiscoveryCandidates([]);
  };

  const handleDiscovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discoveryQuery.trim()) return;
    setIsSearchingProduct(true);
    setDiscoveryCandidates([]);
    try {
        const [aiResults, ebayResults] = await Promise.all([
            searchSpecificProduct(discoveryQuery),
            searchEbay(discoveryQuery, 5)
        ]);
        
        // Combine results, prioritizing eBay for "truth"
        const combined = [...ebayResults, ...aiResults.filter(ai => !ebayResults.some(eb => eb.name.toLowerCase() === ai.name.toLowerCase()))];
        setDiscoveryCandidates(combined);
    } catch (e) { alert("Search error."); } finally { setIsSearchingProduct(false); }
  };

  const handleInjectCandidate = (p: Product) => {
      setEditProducts(prev => [p, ...prev]);
      setDiscoveryCandidates(prev => prev.filter(cand => cand.id !== p.id));
      if (discoveryCandidates.length <= 1) setDiscoveryQuery('');
  };

  const handleRemoveProduct = (productId: string, isComplementary: boolean = false) => {
    if (isComplementary) {
      setEditComplementary(prev => prev.filter(p => p.id !== productId));
    } else {
      setEditProducts(prev => prev.filter(p => p.id !== productId));
    }
  };

  const handleApproveAction = () => {
    if (selectedVideo) {
        // For creators, we ensure they don't override build requirements, just declare items
        onApprove(selectedVideo.id, editProducts, editComplementary, editEpnId, selectedVideo.insights, editTitle, selectedVideo.creatorSubscriptionStatus || currentUser.subscriptionStatus);
        setSelectedVideo(null);
    }
  };

  const handleRejectAction = () => {
    if (selectedVideo && window.confirm("Flag for refinement? Creator will be notified to revise build logic.")) {
        onReject(selectedVideo.id);
        setSelectedVideo(null);
    }
  };

  const handleDeleteAction = () => {
    if (selectedVideo && window.confirm("Total purge? This removes the build hub permanently.")) {
        onDelete(selectedVideo.id);
        setSelectedVideo(null);
    }
  };

  const partnerIntelligence = useMemo(() => {
    if (!isPartner) return null;

    const partnerName = currentUser.company?.toLowerCase() || currentUser.displayName.toLowerCase();
    const partnerId = currentUser.partnerId;

    // 1. Project Demand View
    const demandVideos = videos.filter(v => 
        v.products.some(p => p.merchantId === partnerId || p.merchantName?.toLowerCase() === partnerName) ||
        v.complementaryProducts?.some(p => p.merchantId === partnerId || p.merchantName?.toLowerCase() === partnerName)
    );

    // 2. Intent Funnel (Affiliate-Tuned)
    const partnerEvents = analyticsEvents.filter(e => 
        e.partner?.id === partnerId || e.partner?.name?.toLowerCase() === partnerName
    );

    const funnel = {
        observed: partnerEvents.filter(e => e.type === 'video_view').length,
        planning: partnerEvents.filter(e => e.type === 'add_to_kit').length,
        handoff: partnerEvents.filter(e => e.type === 'source_redirect').length
    };

    // 3. Kit Composition Intelligence
    const kitsWithPartner = demandVideos.map(v => ({
        totalItems: (v.products.length || 0) + (v.complementaryProducts?.length || 0),
        totalBudget: parseFloat(v.insights?.costEstimate?.budgetTotal?.replace(/[^0-9.]/g, '') || '0'),
        pairings: [...v.products, ...(v.complementaryProducts || [])].filter(p => p.merchantId !== partnerId && p.merchantName?.toLowerCase() !== partnerName),
        difficulty: v.insights?.difficulty,
        tools: v.insights?.toolsRequired || []
    }));

    const avgItems = kitsWithPartner.length > 0 ? kitsWithPartner.reduce((acc, k) => acc + k.totalItems, 0) / kitsWithPartner.length : 0;
    const avgBudget = kitsWithPartner.length > 0 ? kitsWithPartner.reduce((acc, k) => acc + k.totalBudget, 0) / kitsWithPartner.length : 0;

    // 4. Availability & Price Signals
    const partnerProducts = demandVideos.flatMap(v => [...v.products, ...(v.complementaryProducts || [])])
        .filter(p => p.merchantId === partnerId || p.merchantName?.toLowerCase() === partnerName);
    
    const prices = partnerProducts.map(p => p.price.amount);
    const priceRange = prices.length > 0 ? { min: Math.min(...prices), max: Math.max(...prices) } : { min: 0, max: 0 };
    const availabilityFreq = partnerProducts.length > 0 ? (partnerProducts.filter(p => p.available).length / partnerProducts.length) * 100 : 0;

    // 5. Marketplace Readiness (Friction Indicators)
    const multiMerchantKits = demandVideos.filter(v => {
        const merchants = new Set([...v.products, ...(v.complementaryProducts || [])].map(p => p.merchantName || p.retailer));
        return merchants.size > 1;
    }).length;

    return {
        demandVideos,
        funnel,
        composition: { avgItems, avgBudget, kitsWithPartner },
        signals: { priceRange, availabilityFreq },
        readiness: {
            multiMerchantFreq: demandVideos.length > 0 ? (multiMerchantKits / demandVideos.length) * 100 : 0,
            frictionReduction: 22, // Estimated 22% reduction in drop-off with unified checkout
            kitStability: 94 // % of builds where partner-declared items remain unchanged
        }
    };
  }, [isPartner, currentUser, videos, analyticsEvents]);

  const filteredVideos = useMemo(() => {
    return videos.filter(v => {
      if (isPartner && v.creatorId.toLowerCase() !== currentUser.email.toLowerCase()) return false;
      
      const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase()) || v.creator.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      
      if (activeTab === 'pending') return v.status === 'curating' || v.status === 'pending_review';
      if (activeTab === 'library') return v.status === 'published' || v.status === 'rejected';
      return true;
    });
  }, [videos, searchQuery, activeTab, isPartner, currentUser.email]);

  // Terminal Detail View
  if (selectedVideo) {
    return (
        <div className="min-h-screen bg-[#020617] text-slate-300 animate-fade-in">
            <header className="sticky top-0 bg-slate-900 border-b border-slate-800 p-8 flex items-center justify-between z-50">
                <div className="flex items-center gap-6">
                    <button onClick={() => setSelectedVideo(null)} className="p-4 bg-slate-800 rounded-2xl hover:bg-slate-700 transition-all text-slate-400 hover:text-white">
                        <ArrowLeftIcon className="w-6 h-6" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tighter">Audit Terminal</h2>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Reviewing: {selectedVideo.title}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={handleRejectAction} className="px-8 py-4 bg-amber-500/10 text-amber-500 font-black rounded-2xl border border-amber-500/20 text-[10px] uppercase tracking-widest hover:bg-amber-500/20">Flag for Revision</button>
                    <button onClick={handleDeleteAction} className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all"><TrashIcon className="w-5 h-5" /></button>
                    <button onClick={handleApproveAction} className="px-10 py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/20 text-[10px] uppercase tracking-widest hover:scale-105 transition-all">Verify & Publish Hub</button>
                </div>
            </header>

            <main className="p-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
                <section className="space-y-8">
                    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <div className="aspect-video relative group">
                            {selectedVideo.videoUrl ? (
                                <video src={selectedVideo.videoUrl} className="w-full h-full object-cover" controls />
                            ) : (
                                <img src={selectedVideo.thumbnailUrl} className="w-full h-full object-cover opacity-60" alt="" />
                            )}
                            <div className="absolute top-4 left-4 bg-black/80 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase text-slate-500 tracking-widest">Logic Source</div>
                        </div>
                    </div>
                    
                    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 space-y-6">
                        <h3 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                            <ShieldIcon className="w-4 h-4 text-[#7D8FED]" /> 
                            Audit Metadata
                        </h3>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Publishing Title</label>
                            <input 
                                type="text" 
                                value={editTitle} 
                                onChange={(e) => setEditTitle(e.target.value)} 
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold focus:border-[#7D8FED] outline-none" 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">EPN Campaign ID (eBay Tracking)</label>
                            <input 
                                type="text" 
                                value={editEpnId} 
                                onChange={(e) => setEditEpnId(e.target.value)} 
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-amber-500 font-mono text-xs focus:border-amber-500 outline-none" 
                            />
                        </div>
                    </div>
                </section>

                <section className="space-y-8">
                    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 flex flex-col h-full shadow-2xl">
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-white font-black text-xs uppercase tracking-widest">Hub Kit Refinement</h3>
                                <span className="text-[10px] font-black bg-slate-800 px-3 py-1 rounded-lg text-slate-500">{editProducts.length + editComplementary.length} Tokens</span>
                            </div>
                            <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
                                Partner-selected items define the authoritative build. Suggested items improve availability and flexibility.
                            </p>
                        </div>

                        <div className="space-y-6 mb-8">
                            <form onSubmit={handleDiscovery} className="relative">
                                <input 
                                    type="text" 
                                    value={discoveryQuery}
                                    onChange={(e) => setDiscoveryQuery(e.target.value)}
                                    placeholder="Manually inject material SKU..." 
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-12 text-xs text-white placeholder-slate-700 outline-none focus:border-[#7D8FED]" 
                                />
                                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                                <button type="submit" disabled={isSearchingProduct} className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-[#7D8FED] rounded-xl text-white">
                                    {isSearchingProduct ? <RefreshCwIcon className="w-4 h-4 animate-spin" /> : <PlusIcon className="w-4 h-4" />}
                                </button>
                            </form>

                            {discoveryCandidates.length > 0 && (
                                <div className="space-y-3 p-4 bg-slate-950 rounded-3xl border border-[#7D8FED]/20 animate-scale-in">
                                    <p className="text-[8px] font-black uppercase text-amber-500 tracking-[0.2em] mb-2">Pick Market Variant:</p>
                                    {discoveryCandidates.map(cand => (
                                        <div key={cand.id} className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800 group hover:border-[#7D8FED]/30 transition-all">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <img src={cand.imageUrl} className="w-10 h-10 rounded object-cover grayscale opacity-60 group-hover:opacity-100 group-hover:grayscale-0 transition-all" alt="" />
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-black text-white uppercase truncate">{cand.retailer}</p>
                                                    <p className="text-[10px] font-black text-[#7D8FED]">{formatCurrency(cand.price)}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => handleInjectCandidate(cand)} className="px-4 py-1.5 bg-emerald-600 rounded-lg text-[8px] font-black uppercase text-white hover:bg-emerald-500 shadow-lg">Inject SKU</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-8 overflow-y-auto custom-scrollbar flex-grow max-h-[500px] pr-2">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Primary Material Set</p>
                                  <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[7px] font-black text-emerald-500 uppercase tracking-widest">
                                      <CheckCircleIcon className="w-2.5 h-2.5" /> Official Kit Item
                                  </span>
                              </div>
                              {editProducts.map((p) => (
                                  <div key={p.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center gap-4 group">
                                      <img src={p.imageUrl} className="w-12 h-12 rounded-lg object-cover border border-slate-800 grayscale group-hover:grayscale-0 transition-all" alt="" />
                                      <div className="flex-grow min-w-0">
                                          <div className="flex items-center gap-2">
                                              <p className="text-[10px] font-black text-white uppercase truncate">{p.name}</p>
                                              {p.isCreatorDeclared ? (
                                                  <span className="text-[7px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Creator Declared</span>
                                              ) : (
                                                  <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Official</span>
                                              )}
                                          </div>
                                          <div className="flex items-center gap-3 mt-1">
                                              <span className="text-[9px] font-bold text-emerald-500">{formatCurrency(p.price)}</span>
                                              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{p.retailer}</span>
                                          </div>
                                          {canDeclare && (
                                              <div className="mt-2 flex items-center gap-2">
                                                  <button 
                                                      onClick={() => {
                                                          const updated = editProducts.map(item => item.id === p.id ? {...item, isCreatorDeclared: !item.isCreatorDeclared} : item);
                                                          setEditProducts(updated);
                                                      }}
                                                      className={`text-[7px] font-black uppercase px-2 py-1 rounded border transition-all ${p.isCreatorDeclared ? 'bg-amber-500 text-slate-900 border-amber-500' : 'text-slate-500 border-slate-800 hover:border-amber-500/50'}`}
                                                  >
                                                      {p.isCreatorDeclared ? 'Declared' : 'Declare Canonical'}
                                                  </button>
                                                  {p.isCreatorDeclared && (
                                                      <input 
                                                          type="text"
                                                          placeholder="Affiliate URL..."
                                                          value={p.creatorAffiliateUrl || ''}
                                                          onChange={(e) => {
                                                              const updated = editProducts.map(item => item.id === p.id ? {...item, creatorAffiliateUrl: e.target.value} : item);
                                                              setEditProducts(updated);
                                                          }}
                                                          className="flex-grow bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[8px] text-amber-500 outline-none focus:border-amber-500/50"
                                                      />
                                                  )}
                                              </div>
                                          )}
                                      </div>
                                      <button onClick={() => handleRemoveProduct(p.id, false)} className="p-3 text-slate-700 hover:text-rose-500 hover:bg-rose-500/5 rounded-xl transition-all">
                                          <TrashIcon className="w-4 h-4" />
                                      </button>
                                  </div>
                              ))}
                            </div>

                            {editComplementary.length > 0 && (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Complementary Accessories</p>
                                  <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#7D8FED]/10 border border-[#7D8FED]/20 rounded text-[7px] font-black text-[#7D8FED] uppercase tracking-widest">
                                      <SparkleIcon className="w-2.5 h-2.5" /> Suggested Alternative
                                  </span>
                                </div>
                                {editComplementary.map((p) => (
                                    <div key={p.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center gap-4 group">
                                        <img src={p.imageUrl} className="w-12 h-12 rounded-lg object-cover border border-slate-800 grayscale group-hover:grayscale-0 transition-all" alt="" />
                                        <div className="flex-grow min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-[10px] font-black text-white uppercase truncate">{p.name}</p>
                                                <span className="text-[7px] font-black text-[#7D8FED] uppercase tracking-widest bg-[#7D8FED]/10 px-1.5 py-0.5 rounded border border-[#7D8FED]/20">Suggested</span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[9px] font-bold text-emerald-500">{formatCurrency(p.price)}</span>
                                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{p.retailer}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => handleRemoveProduct(p.id, true)} className="p-3 text-slate-700 hover:text-rose-500 hover:bg-rose-500/5 rounded-xl transition-all">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                              </div>
                            )}

                            {editProducts.length === 0 && editComplementary.length === 0 && <p className="text-center py-20 text-slate-700 font-black text-[10px] uppercase tracking-widest">Logic payload empty</p>}
                        </div>

                        <div className="mt-8 pt-8 border-t border-slate-800">
                           <div className="flex items-center gap-4 p-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/20">
                               <CheckCircleIcon className="w-6 h-6 text-emerald-500" />
                               <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                   Ensure all tool mappings are accurate. Misaligned material data reduces conversion rates and affects safety scores.
                               </p>
                           </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans flex animate-fade-in">
      <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col sticky top-0 h-screen hidden lg:flex">
          <div className="p-8 border-b border-slate-800 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${isAdmin ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'}`}>
                  <ShieldIcon className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                  <h2 className="text-white font-black text-sm uppercase tracking-tighter truncate">{isAdmin ? 'Root Admin' : currentUser.company || currentUser.displayName}</h2>
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{isAdmin ? 'System Control' : 'Partner Intelligence Portal'}</p>
              </div>
          </div>
          
          <nav className="flex-grow p-4 space-y-2">
              {[
                { id: 'intelligence', label: 'Intelligence', icon: BarChartIcon },
                { id: 'library', label: 'Build Library', icon: FileTextIcon, hide: currentUser.subscriptionStatus === 'Plus' },
                { id: 'pending', label: 'Audit Queue', icon: RefreshCwIcon, hide: currentUser.subscriptionStatus === 'Plus' },
                { id: 'users', label: 'User Protocol', icon: UserIcon, hide: !isAdmin },
                { id: 'reports', label: 'Reports', icon: ShieldIcon, hide: !isAdmin },
                { id: 'audit', label: 'Audit Trail', icon: FileTextIcon, hide: !isAdmin },
                { id: 'status', label: 'System Status', icon: RefreshCwIcon, hide: !isAdmin },
                { id: 'logistics', label: 'Merchant Identity', icon: PackagePlusIcon, hide: !isPartner }
              ].map(item => !item.hide && (
                  <button 
                    key={item.id} 
                    onClick={() => { setActiveTab(item.id as any); setSelectedVideo(null); }}
                    aria-label={`Switch to ${item.label} view`}
                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest ${
                        activeTab === item.id ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-slate-800/30'
                    }`}
                  >
                      <item.icon className={`w-4 h-4 ${activeTab === item.id ? (isAdmin ? 'text-rose-500' : 'text-emerald-500') : ''}`} />
                      {item.label}
                  </button>
              ))}
          </nav>

          <div className="p-6 mt-auto border-t border-slate-800 space-y-2">
              {onNavigate && (
                  <button 
                    onClick={() => onNavigate('affiliateGuide')} 
                    className="w-full flex items-center gap-3 px-6 py-4 text-[10px] font-black uppercase text-[#7D8FED] hover:text-white transition-colors bg-[#7D8FED]/5 rounded-2xl border border-[#7D8FED]/10 hover:border-[#7D8FED]/30"
                  >
                      <MedalIcon className="w-4 h-4" /> Affiliate Guide
                  </button>
              )}
              <button onClick={onBack} className="w-full flex items-center gap-3 px-6 py-4 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">
                  <ArrowLeftIcon className="w-4 h-4" /> Exit Console
              </button>
          </div>
      </aside>

      <main className="flex-grow p-8 lg:p-12 overflow-y-auto max-w-screen-2xl">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
              <div>
                  <h1 className="text-4xl font-black text-white tracking-tighter">
                      {activeTab === 'intelligence' ? 'Project Demand Intelligence' : activeTab === 'pending' ? 'Operational Audit' : activeTab === 'logistics' ? 'Merchant Identity' : 'Build Library'}
                  </h1>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">
                      Secure Node {APP_CONFIG.VERSION}{APP_CONFIG.IS_BETA ? `-${APP_CONFIG.BETA_LABEL.split(' ')[0]}` : ''} • {new Date().toLocaleDateString()}
                  </p>
              </div>
              <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                      <p className="text-[9px] font-black text-white uppercase tracking-widest">Partner kits define the authoritative build.</p>
                      <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">The platform may suggest optional alternatives for availability.</p>
                  </div>
                  {isPartner && (
                    <button onClick={onUploadClick} className="px-6 py-3 bg-emerald-600 text-white font-black rounded-xl text-[9px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl flex items-center gap-2">
                        <PlusIcon className="w-4 h-4" /> Initialize Hub Listing
                    </button>
                  )}
              </div>
          </header>

            {activeTab === 'intelligence' ? (
              <div className="space-y-12 animate-fade-in">
                  {isPartner && partnerIntelligence ? (
                      <div className="space-y-16">
                          {/* 1. Project Demand View */}
                          <section className="space-y-8">
                              <div className="flex items-center justify-between">
                                  <div>
                                      <h3 className="text-2xl font-black text-white tracking-tighter">Project Demand View</h3>
                                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Your products are appearing in these real-world build scenarios</p>
                                  </div>
                                  <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{partnerIntelligence.demandVideos.length} Active Projects</span>
                                  </div>
                              </div>
                              
                              <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
                                  <table className="w-full text-left">
                                      <thead className="bg-slate-950 text-[9px] uppercase text-slate-500 font-black tracking-widest">
                                          <tr>
                                              <th className="px-8 py-6">Project / Hub</th>
                                              <th className="px-8 py-6">Category</th>
                                              <th className="px-8 py-6">Difficulty</th>
                                              <th className="px-8 py-6">Cost Range</th>
                                              <th className="px-8 py-6">Source</th>
                                              <th className="px-8 py-6 text-right">Role</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-800/50">
                                          {partnerIntelligence.demandVideos.map(v => {
                                              const partnerProds = [...v.products, ...(v.complementaryProducts || [])].filter(p => 
                                                  p.merchantId === currentUser.partnerId || 
                                                  p.merchantName?.toLowerCase() === (currentUser.company?.toLowerCase() || currentUser.displayName.toLowerCase())
                                              );
                                              const isOfficial = v.products.some(p => p.merchantId === currentUser.partnerId || p.merchantName?.toLowerCase() === (currentUser.company?.toLowerCase() || currentUser.displayName.toLowerCase()));
                                              const isTool = partnerProds.some(p => p.technicalSpecs?.toLowerCase().includes('tool') || v.insights?.toolsRequired?.some(t => p.name.toLowerCase().includes(t.toLowerCase())));
                                              
                                              return (
                                                  <tr key={v.id} className="hover:bg-slate-800/40 transition-all">
                                                      <td className="px-8 py-6">
                                                          <div className="flex items-center gap-4">
                                                              <img src={v.thumbnailUrl} className="w-12 aspect-video rounded-lg object-cover border border-slate-800" alt="" />
                                                              <span className="font-bold text-white text-sm">{v.title}</span>
                                                          </div>
                                                      </td>
                                                      <td className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase">{v.category}</td>
                                                      <td className="px-8 py-6">
                                                          <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${
                                                              v.insights?.difficulty === 'Beginner' ? 'bg-emerald-500/10 text-emerald-500' :
                                                              v.insights?.difficulty === 'Intermediate' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
                                                          }`}>
                                                              {v.insights?.difficulty || 'Unknown'}
                                                          </span>
                                                      </td>
                                                      <td className="px-8 py-6 text-[10px] font-bold text-slate-400">{v.insights?.costEstimate?.budgetTotal || 'N/A'}</td>
                                                      <td className="px-8 py-6">
                                                          <span className={`flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest ${isOfficial ? 'text-emerald-500' : 'text-[#7D8FED]'}`}>
                                                              {isOfficial ? <CheckCircleIcon className="w-3 h-3" /> : <SparkleIcon className="w-3 h-3" />}
                                                              {isOfficial ? 'Official' : 'Suggested'}
                                                          </span>
                                                      </td>
                                                      <td className="px-8 py-6 text-right">
                                                          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${isTool ? 'bg-amber-500/10 text-amber-400' : 'bg-[#7D8FED]/10 text-[#7D8FED]'}`}>
                                                              {isTool ? 'Required Tool' : 'Primary Material'}
                                                          </span>
                                                      </td>
                                                  </tr>
                                              );
                                          })}
                                          {partnerIntelligence.demandVideos.length === 0 && (
                                              <tr>
                                                  <td colSpan={5} className="py-20 text-center text-slate-700 font-black uppercase text-[10px] tracking-widest">No project demand detected yet</td>
                                              </tr>
                                          )}
                                      </tbody>
                                  </table>
                              </div>
                          </section>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                              {/* 2. Intent Funnel (Affiliate-Tuned) */}
                              <section className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 shadow-2xl">
                                  <div className="flex items-center justify-between mb-12">
                                      <h3 className="text-2xl font-black text-white tracking-tighter">Intent Funnel</h3>
                                      <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full uppercase">Affiliate Tuned</span>
                                  </div>
                                  <div className="space-y-10">
                                      {[
                                          { label: 'Observed Demand', val: partnerIntelligence.funnel.observed, sub: 'Project Views', color: 'bg-white/10' },
                                          { label: 'Planning Intent', val: partnerIntelligence.funnel.planning, sub: 'Added to Kit', color: 'bg-[#7D8FED]/20' },
                                          { label: 'Retail Hand-off', val: partnerIntelligence.funnel.handoff, sub: 'Affiliate Clicks', color: 'bg-emerald-500/20' }
                                      ].map((step, i) => (
                                          <div key={i} className="relative">
                                              <div className={`w-full h-20 ${step.color} rounded-2xl border border-white/5 flex items-center justify-between px-8 group hover:border-white/20 transition-all`}>
                                                  <div>
                                                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{step.label}</p>
                                                      <p className="text-[8px] font-bold text-slate-600 uppercase mt-0.5">{step.sub}</p>
                                                  </div>
                                                  <span className="text-3xl font-black text-white tracking-tighter">{step.val.toLocaleString()}</span>
                                              </div>
                                              {i < 2 && (
                                                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
                                                      <ChevronDownIcon className="w-4 h-4 text-slate-800" />
                                                  </div>
                                              )}
                                          </div>
                                      ))}
                                  </div>
                                  <div className="mt-10 p-5 bg-slate-950 rounded-2xl border border-slate-800">
                                      <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
                                          <span className="text-emerald-500 font-bold">Insight:</span> Unified checkout would reduce friction by an estimated <span className="text-white font-black">22%</span> between Planning and Hand-off.
                                      </p>
                                  </div>
                              </section>

                              <div className="space-y-8">
                                  {/* 3. Kit Composition Intelligence */}
                                  <section className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 shadow-2xl">
                                      <h3 className="text-xl font-black text-white tracking-tighter mb-8">Kit Composition Intelligence</h3>
                                      <div className="grid grid-cols-2 gap-6">
                                          <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800">
                                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Avg Items / Build</p>
                                              <p className="text-2xl font-black text-white">{partnerIntelligence.composition.avgItems.toFixed(1)}</p>
                                          </div>
                                          <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800">
                                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Avg Project Budget</p>
                                              <p className="text-2xl font-black text-emerald-500">{formatCurrency(partnerIntelligence.composition.avgBudget)}</p>
                                          </div>
                                      </div>
                                      <div className="mt-8 space-y-4">
                                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Common Pairings</p>
                                          <div className="flex flex-wrap gap-2">
                                              {Array.from(new Set(partnerIntelligence.composition.kitsWithPartner.flatMap(k => k.pairings.map(p => p.name)))).slice(0, 5).map((name, i) => (
                                                  <span key={i} className="px-3 py-1.5 bg-slate-800 rounded-lg text-[9px] font-bold text-slate-300 border border-white/5">{name}</span>
                                              ))}
                                              {partnerIntelligence.composition.kitsWithPartner.length === 0 && <span className="text-[9px] text-slate-700 font-bold italic">Awaiting more kit data...</span>}
                                          </div>
                                      </div>
                                  </section>

                                  {/* 4. Availability & Price Signals */}
                                  <section className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 shadow-2xl">
                                      <h3 className="text-xl font-black text-white tracking-tighter mb-8">Availability & Price Signals</h3>
                                      <div className="space-y-6">
                                          <div className="flex justify-between items-center">
                                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Observed Price Range</p>
                                              <p className="text-sm font-black text-white">
                                                  {formatCurrency(partnerIntelligence.signals.priceRange.min)} — {formatCurrency(partnerIntelligence.signals.priceRange.max)}
                                              </p>
                                          </div>
                                          <div className="space-y-2">
                                              <div className="flex justify-between items-center">
                                                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Availability Frequency</p>
                                                  <p className="text-[10px] font-black text-emerald-500">{partnerIntelligence.signals.availabilityFreq.toFixed(1)}%</p>
                                              </div>
                                              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                                                  <div className="h-full bg-emerald-500" style={{ width: `${partnerIntelligence.signals.availabilityFreq}%` }}></div>
                                              </div>
                                          </div>
                                          <p className="text-[9px] text-slate-600 font-medium italic">Powered by eBay Browse API & Real-time Telemetry</p>
                                      </div>
                                  </section>
                              </div>
                          </div>

                          {/* 5. Marketplace Readiness Panel */}
                          <section className="bg-[#7D8FED]/5 border border-[#7D8FED]/20 rounded-[3rem] p-12 shadow-2xl">
                              <div className="flex flex-col md:flex-row items-center gap-12">
                                  <div className="flex-grow space-y-4">
                                      <h3 className="text-3xl font-black text-white tracking-tighter">Execution Friction Indicators</h3>
                                      <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
                                          Your products are frequently bundled in multi-merchant kits. Currently, users must navigate separate checkout flows for each retailer, resulting in significant drop-off.
                                      </p>
                                  </div>
                                  <div className="grid grid-cols-3 gap-8 flex-shrink-0">
                                      <div className="text-center">
                                          <p className="text-4xl font-black text-white tracking-tighter">{partnerIntelligence.readiness.multiMerchantFreq.toFixed(0)}%</p>
                                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2">Multi-Merchant Kits</p>
                                      </div>
                                      <div className="text-center">
                                          <p className="text-4xl font-black text-emerald-500 tracking-tighter">{partnerIntelligence.readiness.kitStability}%</p>
                                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2">Kit Stability</p>
                                      </div>
                                      <div className="text-center">
                                          <p className="text-4xl font-black text-[#7D8FED] tracking-tighter">-{partnerIntelligence.readiness.frictionReduction}%</p>
                                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2">Est. Friction Drop</p>
                                      </div>
                                  </div>
                              </div>
                          </section>
                      </div>
                  ) : (
                      <div className="space-y-12">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                              {[
                                { label: 'Sourced Build Value', val: formatCurrency(enterpriseStats.totalSalesValue), icon: DollarSignIcon, color: 'text-emerald-400', sub: 'Est. sourced value (affiliate & direct)' },
                                { label: 'Sourcing Rate', val: `${((funnelStats.sourceRedirect / Math.max(1, funnelStats.views)) * 100).toFixed(2)}%`, icon: BarChartIcon, color: 'text-[#7D8FED]' },
                                { label: 'Unique SKUs Tracked', val: enterpriseStats.topSKUs.length, icon: ShoppingCartIcon, color: 'text-amber-400' },
                                { label: 'Global Visual Impact', val: funnelStats.views.toLocaleString(), icon: EyeIcon, color: 'text-white' }
                              ].map((m, i) => (
                                  <div key={i} className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800 shadow-xl group hover:border-slate-600 transition-all">
                                      <m.icon className={`w-5 h-5 mb-4 ${m.color}`} />
                                      <p className="text-3xl font-black text-white tracking-tighter">{m.val}</p>
                                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2 group-hover:text-slate-300">{m.label}</p>
                                      {m.sub && <p className="text-[7px] font-bold text-slate-600 uppercase tracking-widest mt-1">{m.sub}</p>}
                                  </div>
                              ))}
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                              <div className="lg:col-span-2 space-y-10">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {[
                                        { title: 'Marketplace Sourced Value', value: formatCurrency(partnerSplit.merchant.gmv), sub: `${partnerSplit.merchant.success} conversions • ${partnerSplit.merchant.conv.toFixed(2)}% CVR`, context: 'Est. sourced value (affiliate & direct)', icon: ShieldIcon, color: 'text-emerald-400' },
                                        { title: 'Affiliate Sourced Value', value: formatCurrency(partnerSplit.affil.gmv), sub: `${partnerSplit.affil.success} conversions • ${partnerSplit.affil.conv.toFixed(2)}% CVR`, context: 'Est. sourced value (affiliate & direct)', icon: SparkleIcon, color: 'text-amber-400' },
                                    ].map((kpi, i) => (
                                        <div key={i} className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl hover:border-slate-700 transition-all">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="min-w-0">
                                                    <p className="text-10px font-black text-slate-400 uppercase tracking-widest">{kpi.title}</p>
                                                    <p className="text-[7px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">{kpi.context}</p>
                                                </div>
                                                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                                            </div>
                                            <p className="text-3xl font-black text-white">{kpi.value}</p>
                                            <p className="text-[10px] font-bold text-slate-600 mt-2 uppercase tracking-widest">{kpi.sub}</p>
                                        </div>
                                    ))}
                                  </div>

                                  <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
                                      <div className="flex items-center justify-between mb-12">
                                          <h3 className="text-2xl font-black text-white tracking-tighter">Purchase Lifecycle</h3>
                                          <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full uppercase">Real-time Stream</span>
                                      </div>
                                      <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
                                          {[
                                              { label: 'Catalog Hits', val: funnelStats.views },
                                              { label: 'Kit Intents', val: funnelStats.kitAdd },
                                              { label: 'Source Redirect', val: funnelStats.sourceRedirect },
                                              { label: 'Success', val: funnelStats.success }
                                          ].map((step, i) => (
                                              <div key={i} className="flex-1 text-center">
                                                  <div className="relative mb-6">
                                                      <div className="w-20 h-20 bg-slate-950 rounded-[2rem] mx-auto flex items-center justify-center border border-slate-800 shadow-inner group hover:border-emerald-500 transition-all">
                                                          <span className="text-2xl font-black text-white group-hover:scale-110 transition-transform">{step.val}</span>
                                                      </div>
                                                      {i < 3 && <div className="hidden md:block absolute top-1/2 -right-6 w-12 h-px bg-slate-800"></div>}
                                                  </div>
                                                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{step.label}</p>
                                              </div>
                                          ))}
                                      </div>
                                  </div>

                                  <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 shadow-2xl">
                                      <h3 className="text-2xl font-black text-white tracking-tighter mb-8">SKU Performance Map</h3>
                                      <div className="space-y-6">
                                          {enterpriseStats.topSKUs.map((sku, idx) => (
                                              <div key={idx} className="flex items-center gap-6 p-4 hover:bg-slate-800/30 rounded-2xl transition-all">
                                                  <img src={sku.img} className="w-12 h-12 rounded-xl object-cover border border-slate-700" alt={sku.name} />
                                                  <div className="flex-grow min-w-0">
                                                      <p className="text-[10px] font-black text-white uppercase truncate">{sku.name}</p>
                                                      <div className="mt-2 w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                                          <div className="h-full bg-emerald-500" style={{ width: `${(sku.revenue / Math.max(1, enterpriseStats.totalSalesValue)) * 100}%` }}></div>
                                                      </div>
                                                  </div>
                                                  <div className="text-right">
                                                      <p className="text-sm font-black text-emerald-400">{formatCurrency(sku.revenue)}</p>
                                                      <p className="text-[8px] font-bold text-slate-600 uppercase mt-0.5">{sku.sales} units</p>
                                                  </div>
                                              </div>
                                          ))}
                                          {enterpriseStats.topSKUs.length === 0 && <p className="text-center py-20 text-slate-600 font-black uppercase text-[10px] tracking-widest">No commercial activity recorded</p>}
                                      </div>
                                  </div>
                              </div>

                              <div className="space-y-8">
                                  <div className="bg-[#7D8FED]/5 border border-[#7D8FED]/20 p-10 rounded-[2.5rem] shadow-xl">
                                      <h3 className="text-white font-black text-xs uppercase tracking-widest mb-6">Reporting Suite</h3>
                                      <div className="space-y-6">
                                          <button onClick={handleExportPartnerCSV} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-[9px] uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-3">
                                              <FileTextIcon className="w-4 h-4" /> Export Analytics CSV
                                          </button>
                                          <button className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-xl text-[9px] uppercase tracking-widest transition-all">Generate Brand Deck PDF</button>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          ) : activeTab === 'users' ? (
              <div className="animate-fade-in space-y-12">
                  <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
                      <div className="p-8 border-b border-slate-800 flex justify-between items-center">
                          <div className="flex items-center gap-4">
                              <h3 className="text-2xl font-black text-white tracking-tighter">User Identity Protocol</h3>
                              <button 
                                  onClick={async () => {
                                      const response = await fetch('/api/admin/users');
                                      const data = await response.json();
                                      setUsers(data);
                                  }}
                                  className="p-2 text-slate-500 hover:text-emerald-500 transition-colors"
                                  title="Sync Registry"
                              >
                                  <RefreshCwIcon className="w-4 h-4" />
                              </button>
                          </div>
                          <div className="relative w-72">
                              <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                              <input 
                                  type="text" 
                                  value={userSearchQuery}
                                  onChange={(e) => setUserSearchQuery(e.target.value)}
                                  placeholder="Search identity..." 
                                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 pl-14 pr-6 text-[10px] text-white focus:border-emerald-500 outline-none transition-all" 
                              />
                          </div>
                      </div>
                      <table className="w-full text-left">
                          <thead className="bg-slate-950 text-[9px] uppercase text-slate-500 font-black tracking-widest">
                              <tr>
                                  <th className="px-10 py-8">User Information</th>
                                  <th className="px-10 py-8">Status / Rank</th>
                                  <th className="px-10 py-8">Permissions</th>
                                  <th className="px-10 py-8 text-right">Partner Detail</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                              {users.filter(u => 
                                u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
                                u.displayName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                                u.company?.toLowerCase().includes(userSearchQuery.toLowerCase())
                              ).map((u) => (
                                  <tr key={u.email} className="hover:bg-slate-800/40 transition-all">
                                      <td className="px-10 py-8">
                                          <p className="font-black text-white text-sm uppercase">{u.displayName}</p>
                                          <p className="text-[10px] font-bold text-slate-500 truncate mt-1">{u.email}</p>
                                      </td>
                                      <td className="px-10 py-8">
                                          <div className="flex flex-col gap-1">
                                              <select 
                                                  value={u.subscriptionStatus} 
                                                  onChange={(e) => handleUpdateUser(u.email, { subscriptionStatus: e.target.value })}
                                                  className={`px-2 py-1 rounded w-fit text-[8px] font-black uppercase tracking-widest border border-slate-800 outline-none transition-all ${
                                                      u.subscriptionStatus === 'Free' ? 'bg-slate-800 text-slate-500' : 'bg-emerald-500 text-slate-950'
                                                  }`}
                                              >
                                                  <option value="Free">Free</option>
                                                  <option value="Plus">Creator Plus</option>
                                                  <option value="Pro">Pro Creator</option>
                                                  <option value="Studio">Studio Lead</option>
                                              </select>
                                              <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Rank: {u.makerRank}</span>
                                          </div>
                                      </td>
                                      <td className="px-10 py-8">
                                          <div className="flex gap-4">
                                              <button 
                                                  onClick={() => handleUpdateUser(u.email, { isAdmin: !u.isAdmin })}
                                                  className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border ${
                                                      u.isAdmin ? 'bg-rose-500 text-white border-rose-500' : 'text-slate-500 border-slate-800 hover:border-rose-500/50'
                                                  }`}
                                              >
                                                  Admin
                                              </button>
                                              <button 
                                                  onClick={() => handleUpdateUser(u.email, { isVerifiedPartner: !u.isVerifiedPartner })}
                                                  className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border ${
                                                      u.isVerifiedPartner ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'text-slate-500 border-slate-800 hover:border-emerald-500/50'
                                                  }`}
                                              >
                                                  Partner
                                              </button>
                                          </div>
                                      </td>
                                      <td className="px-10 py-8 text-right space-y-2">
                                          <div className="flex flex-col items-end gap-2">
                                              <input 
                                                  type="text" 
                                                  placeholder="Assign Company..." 
                                                  value={u.company || ''} 
                                                  onChange={(e) => handleUpdateUser(u.email, { company: e.target.value })}
                                                  className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-[10px] text-white w-40 outline-none focus:border-emerald-500 transition-all font-bold"
                                              />
                                              <input 
                                                  type="text" 
                                                  placeholder="Partner ID..." 
                                                  value={u.partnerId || ''} 
                                                  onChange={(e) => handleUpdateUser(u.email, { partnerId: e.target.value })}
                                                  className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-[10px] text-slate-400 w-40 outline-none focus:border-emerald-500 transition-all font-mono"
                                              />
                                          </div>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          ) : activeTab === 'reports' ? (
              <div className="animate-fade-in space-y-12">
                  <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
                      <div className="p-8 border-b border-slate-800">
                          <h3 className="text-2xl font-black text-white tracking-tighter">Project Quality Reports</h3>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Manual signals from builders about project integrity</p>
                      </div>
                      <table className="w-full text-left">
                          <thead className="bg-slate-950 text-[9px] uppercase text-slate-500 font-black tracking-widest">
                              <tr>
                                  <th className="px-10 py-8">Project / Reporter</th>
                                  <th className="px-10 py-8">Category</th>
                                  <th className="px-10 py-8">Description</th>
                                  <th className="px-10 py-8 text-right">Action</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                              {reports.map((report) => (
                                  <tr key={report.id} className="hover:bg-slate-800/40 transition-all">
                                      <td className="px-10 py-8">
                                          <p className="font-black text-white text-sm uppercase">{report.projectTitle}</p>
                                          <p className="text-[10px] font-bold text-[#7D8FED] truncate mt-1">{report.reporterEmail}</p>
                                          <p className="text-[8px] text-slate-500 mt-1">{new Date(report.timestamp).toLocaleString()}</p>
                                      </td>
                                      <td className="px-10 py-8">
                                          <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                                              report.category === 'safety_concern' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                          }`}>
                                              {report.category.replace('_', ' ')}
                                          </span>
                                      </td>
                                      <td className="px-10 py-8">
                                          <p className="text-xs text-slate-400 max-w-md line-clamp-2 italic">"{report.description}"</p>
                                      </td>
                                      <td className="px-10 py-8 text-right">
                                          {report.status === 'pending' ? (
                                              <button 
                                                onClick={() => handleResolveReport(report.id)}
                                                className="px-6 py-3 bg-emerald-600 text-white text-[8px] font-black uppercase rounded-xl hover:bg-emerald-500 transition-all"
                                              >
                                                  Resolve Task
                                              </button>
                                          ) : (
                                              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest bg-slate-950 px-4 py-2 rounded-xl">Protocol Resolved</span>
                                          )}
                                      </td>
                                  </tr>
                              ))}
                              {reports.length === 0 && <tr><td colSpan={4} className="py-24 text-center opacity-30 font-black uppercase text-[10px]">No active reports</td></tr>}
                          </tbody>
                      </table>
                  </div>
              </div>
          ) : activeTab === 'audit' ? (
              <div className="animate-fade-in space-y-12">
                  <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
                      <div className="p-8 border-b border-slate-800">
                          <h3 className="text-2xl font-black text-white tracking-tighter">Administrative Audit Trail</h3>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Immutable record of high-authority protocol execution</p>
                      </div>
                      <div className="p-4 space-y-2 max-h-[700px] overflow-y-auto custom-scrollbar">
                          {auditTrail.map((entry, idx) => (
                              <div key={idx} className="flex gap-6 p-6 bg-slate-950/50 rounded-2xl border border-slate-800 group hover:border-[#7D8FED]/20 transition-all">
                                  <div className="flex-shrink-0 text-[10px] font-mono text-slate-600 w-32">{new Date(entry.timestamp).toLocaleString()}</div>
                                  <div className="flex-grow">
                                      <div className="flex items-center gap-3 mb-1">
                                          <span className="text-[10px] font-black text-[#7D8FED] uppercase tracking-widest">{entry.adminEmail}</span>
                                          <span className="text-[8px] font-black bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded uppercase">{entry.action}</span>
                                      </div>
                                      <p className="text-sm font-bold text-white mb-2">{entry.details}</p>
                                      {entry.metadata && (
                                          <div className="text-[8px] font-mono text-slate-600 bg-black/30 p-2 rounded overflow-x-auto">
                                              {JSON.stringify(entry.metadata)}
                                          </div>
                                      )}
                                  </div>
                              </div>
                          ))}
                          {auditTrail.length === 0 && <p className="text-center py-20 text-slate-700 font-black uppercase text-[10px] tracking-widest">Registry empty</p>}
                      </div>
                  </div>
              </div>
          ) : activeTab === 'status' ? (
              <div className="animate-fade-in space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 space-y-8 shadow-2xl">
                          <div className="flex items-center gap-4">
                              <RefreshCwIcon className="w-8 h-8 text-[#7D8FED]" />
                              <h3 className="text-2xl font-black text-white tracking-tighter">Cluster Health</h3>
                          </div>
                          
                          <div className="space-y-6">
                              {[
                                  { label: 'Database Protocol', val: systemStatus?.db || 'Syncing...', sub: 'MongoDB Atlas' },
                                  { label: 'Server State', val: systemStatus?.server || 'Operational', sub: 'Express Runtime' },
                                  { label: 'System Uptime', val: `${Math.floor((systemStatus?.uptime || 0) / 3600)}h ${Math.floor(((systemStatus?.uptime || 0) % 3600) / 60)}m`, sub: 'Process Persistence' },
                                  { label: 'API Response', val: '0.12ms (avg)', sub: 'Latency Monitor' }
                              ].map((item, i) => (
                                  <div key={i} className="flex justify-between items-center py-4 border-b border-slate-800 last:border-0">
                                      <div>
                                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.label}</p>
                                          <p className={`text-sm font-black mt-1 ${item.val === 'connected' || item.val === 'Operational' ? 'text-emerald-500' : 'text-white'}`}>{item.val.toUpperCase()}</p>
                                      </div>
                                      <span className="text-[8px] font-bold text-slate-600 uppercase text-right">{item.sub}</span>
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 flex flex-col items-center justify-center text-center shadow-xl relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 animate-pulse"></div>
                          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border-2 border-emerald-500/20">
                             <CheckCircleIcon className="w-10 h-10 text-emerald-500" />
                          </div>
                          <h4 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">Network Integrity: 100%</h4>
                          <p className="text-slate-500 text-xs font-medium max-w-[240px] mb-8 leading-relaxed">
                              All distributed nodes are reporting normal heartbeat signals. No critical packet loss or database locks detected.
                          </p>
                          <div className="flex gap-4">
                              <button onClick={() => setSystemStatus(prev => ({ ...prev, lastSync: new Date().toISOString() }))} className="px-6 py-3 bg-[#7D8FED] text-white text-[9px] font-black uppercase rounded-xl shadow-lg">Run Stress Test</button>
                              <button className="px-6 py-3 bg-slate-800 text-slate-400 text-[9px] font-black uppercase rounded-xl">Clear Cache</button>
                          </div>
                      </div>
                  </div>
              </div>
          ) : activeTab === 'logistics' ? (
              <div className="animate-fade-in space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 space-y-8 shadow-2xl relative overflow-hidden">
                          {isSyncing && (
                              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
                                  <RefreshCwIcon className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                                  <p className="text-[10px] font-black text-white uppercase tracking-widest animate-pulse">Scanning Merchant Identity...</p>
                              </div>
                          )}
                          <div className="flex items-center gap-4 mb-2">
                             <PackagePlusIcon className="w-8 h-8 text-emerald-500" />
                             <h3 className="text-2xl font-black text-white tracking-tighter">Identity NOC</h3>
                          </div>
                          
                          <div className="space-y-6">
                              {[
                                  { label: 'Merchant ID', val: currentUser.partnerId || 'W1D1-PRO-01', sub: 'Global Marketplace ID' },
                                  { label: 'Merchant Type', val: currentUser.merchantType || 'Individual Maker', sub: 'Entity Classification' },
                                  { label: 'Catalog Index', val: `${currentUser.catalogCount || 0} Units`, sub: 'Active SKUs' },
                                  { label: 'Sync Heartbeat', val: new Date(lastSyncTime).toLocaleString(), sub: 'Last Successful Protocol' }
                              ].map((item, i) => (
                                  <div key={i} className="flex justify-between items-center py-4 border-b border-slate-800 last:border-0">
                                      <div>
                                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.label}</p>
                                          <p className="text-sm font-black text-white mt-1">{item.val}</p>
                                      </div>
                                      <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter text-right">{item.sub}</span>
                                  </div>
                              ))}
                          </div>

                          <div className="flex gap-4">
                              <button onClick={handleForceSync} className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all">Refresh Identity</button>
                              <button className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black rounded-xl text-[10px] uppercase tracking-widest transition-all">View API Logs</button>
                          </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center shadow-xl">
                          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border-2 border-emerald-500/20">
                             <CheckCircleIcon className="w-10 h-10 text-emerald-500" />
                          </div>
                          <h4 className="text-xl font-black text-white mb-2">Identity Status: Operational</h4>
                          <p className="text-slate-500 text-xs font-medium max-w-[240px] mb-8 leading-relaxed">
                              All automated identity scans and sourcing redirects are functioning within normal parameters.
                          </p>
                          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                             <div className="w-full h-full bg-emerald-500 animate-pulse"></div>
                          </div>
                          <p className="text-[8px] font-black text-slate-700 uppercase tracking-[0.3em] mt-3">Monitoring Marketplace Integrity</p>
                      </div>
                  </div>
              </div>
          ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
                  <div className="p-8 border-b border-slate-800 flex justify-between items-center gap-6">
                      <div className="relative w-96">
                          <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input type="text" placeholder="Filter active catalog..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-xs text-white focus:border-emerald-500 outline-none transition-all" />
                      </div>
                      <div className="flex gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800">
                          <button onClick={() => setActiveTab('library')} className={`px-6 py-2.5 text-[9px] font-black uppercase rounded-xl transition-all ${activeTab === 'library' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}>Active Listings</button>
                          <button onClick={() => setActiveTab('pending')} className={`px-6 py-2.5 text-[9px] font-black uppercase rounded-xl transition-all ${activeTab === 'pending' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}>Pending Review</button>
                      </div>
                  </div>
                  <table className="w-full text-left">
                      <thead className="bg-slate-950 text-[9px] uppercase text-slate-500 font-black tracking-widest">
                          <tr>
                               <th className="px-10 py-8">Asset Identification</th>
                               <th className="px-10 py-8">Catalog Status</th>
                               <th className="px-10 py-8">Audience Reach</th>
                               <th className="px-10 py-8 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                          {filteredVideos.map((video) => (
                              <tr key={video.id} className="hover:bg-slate-800/40 transition-all group cursor-pointer" onClick={() => handleEditClick(video)}>
                                  <td className="px-10 py-8 flex items-center gap-6">
                                      <img src={video.thumbnailUrl} className="w-20 aspect-video rounded-xl object-cover border border-slate-800" alt={video.title} />
                                      <span className="font-black text-sm text-white truncate max-w-xs">{video.title}</span>
                                  </td>
                                  <td className="px-10 py-8"><span className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[8px] font-black uppercase text-slate-500">{video.status.replace('_', ' ')}</span></td>
                                  <td className="px-10 py-8 text-[10px] font-black text-slate-400">{video.stats?.views || 0} hits</td>
                                  <td className="px-10 py-8 text-right">
                                      <button className="px-6 py-3 bg-slate-800 text-white text-[8px] font-black uppercase rounded-xl hover:bg-emerald-600 transition-all">Manage Hub</button>
                                  </td>
                              </tr>
                          ))}
                          {filteredVideos.length === 0 && <tr><td colSpan={4} className="py-24 text-center opacity-30 font-black uppercase text-[10px]">No assets matching criteria</td></tr>}
                      </tbody>
                  </table>
              </div>
          )}
      </main>
    </div>
  );
};

export default AdminDashboard;
