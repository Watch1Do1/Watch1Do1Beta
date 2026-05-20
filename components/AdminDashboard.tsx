import React, { useState, useEffect, useMemo } from 'react';
import type { Video, Product, ProjectInsights, AppEvent, Purchase, ProjectCategory, Money, User, PartnerMeta } from '../types';
import { 
  ShieldIcon, 
  CheckCircleIcon, 
  EyeIcon, 
  ArrowLeftIcon, 
  ShoppingCartIcon, 
  BarChartIcon, 
  DollarSignIcon, 
  RefreshCwIcon, 
  PlusIcon, 
  TrashIcon, 
  XCircleIcon, 
  LinkIcon, 
  SendIcon, 
  MousePointerClickIcon, 
  TrophyIcon, 
  FileTextIcon, 
  ExternalLinkIcon, 
  UserIcon, 
  SparkleIcon, 
  CameraIcon, 
  PackagePlusIcon, 
  ChevronDownIcon, 
  SearchIcon, 
  PencilIcon, 
  PlayIcon, 
  MedalIcon 
} from './IconComponents';
import { PLATFORM_DEFAULT_CAMPID, searchSpecificProduct } from '../services/geminiService';
import { searchEbay } from '../services/ebayService';
import { dbService } from '../services/dbService';

interface AdminDashboardProps {
  videos: Video[];
  currentUser: User;
  onApprove: (
    videoId: number, 
    updatedProducts: Product[], 
    updatedComplementary: Product[], 
    epnCampId?: string, 
    updatedInsights?: ProjectInsights, 
    title?: string, 
    creatorSubscriptionStatus?: string
  ) => void;
  onReject: (videoId: number, reason?: string, note?: string) => void;
  onDelete: (videoId: number) => void;
  onBack: () => void;
  onNavigate?: (view: any) => void;
  onUploadClick?: () => void;
}

const formatCurrency = (m: Money | number) => {
    const amt = typeof m === 'number' ? m : m.amount;
    return `$${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  videos, 
  currentUser, 
  onApprove, 
  onReject, 
  onDelete, 
  onBack, 
  onNavigate, 
  onUploadClick 
}) => {
  const isAdmin = currentUser.isAdmin;
  const isVerifiedPartner = currentUser.isVerifiedPartner && !isAdmin;
  const isCreator = (currentUser.subscriptionStatus === 'Plus' || currentUser.subscriptionStatus === 'Pro' || currentUser.subscriptionStatus === 'Studio') && !isAdmin && !isVerifiedPartner;
  const canDeclare = currentUser.subscriptionStatus === 'Pro' || currentUser.subscriptionStatus === 'Studio';

  // 1. Security Gate
  if (!isAdmin && !isVerifiedPartner && !isCreator) {
    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-8 animate-fade-in font-sans">
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

  const [activeTab, setActiveTab] = useState<'pending' | 'library' | 'intelligence' | 'logistics' | 'users' | 'reports' | 'audit' | 'status'>(
    (isVerifiedPartner || isCreator) ? 'intelligence' : 'pending'
  );
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

  // Rejection/Flag parameters
  const [rejectReason, setRejectReason] = useState('Content Standards');
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

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
            
            if (isVerifiedPartner) {
                const partnerName = currentUser.company?.toLowerCase() || '';
                const partnerId = currentUser.partnerId || '';
                setAnalyticsEvents((events || []).filter(e => 
                    e.partner?.name?.toLowerCase() === partnerName ||
                    e.partner?.id === partnerId ||
                    (e.videoId && videos.some(v => v.id === e.videoId && v.creatorId.toLowerCase() === currentUser.email.toLowerCase()))
                ));

                setPurchaseData((purchases || []).filter(p => 
                    p.partner?.name?.toLowerCase() === partnerName ||
                    p.partner?.id === partnerId ||
                    (p.videoId && videos.some(v => v.id === p.videoId && v.creatorId.toLowerCase() === currentUser.email.toLowerCase()))
                ));
            } else if (isCreator) {
                const creatorEmail = currentUser.email.toLowerCase();
                const myVideoIds = videos.filter(v => v.creatorId.toLowerCase() === creatorEmail).map(v => v.id);
                setAnalyticsEvents((events || []).filter(e => 
                    (e.videoId && myVideoIds.includes(e.videoId)) || e.userId === creatorEmail
                ));
                setPurchaseData((purchases || []).filter(p => 
                    p.videoId && myVideoIds.includes(p.videoId)
                ));
            } else {
                setAnalyticsEvents(events || []);
                setPurchaseData(purchases || []);
            }
        } catch (e) { 
            console.error("Intelligence stream failure", e); 
        }
    };
    fetchIntelligence();
  }, [activeTab, isVerifiedPartner, isCreator, currentUser, videos]);

  useEffect(() => {
    if (isAdmin && activeTab === 'users') {
        const fetchUsers = async () => {
            try {
                const data = await dbService.getAllUsers();
                setUsers(data || []);
            } catch (e) { 
                console.error("User fetch failure", e); 
            }
        };
        fetchUsers();
    }

    if (isAdmin && activeTab === 'reports') {
        const fetchReports = async () => {
            try {
                const data = await dbService.getReports();
                setReports(data || []);
            } catch (e) {
                console.error("Reports fetch failure", e);
            }
        };
        fetchReports();
    }

    if (isAdmin && activeTab === 'audit') {
        const fetchAudit = async () => {
            try {
                const data = await dbService.getAuditTrail();
                setAuditTrail(data || []);
            } catch (e) {
                console.error("Audit trail fetch failure", e);
            }
        };
        fetchAudit();
    }

    if (isAdmin && activeTab === 'status') {
        const fetchStatus = async () => {
            try {
                const data = await dbService.getSystemStatus();
                setSystemStatus(data);
            } catch (e) {
                console.error("Uptime stats failed to fetch", e);
            }
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
    } catch (e) { 
        alert("Resolution failed."); 
    }
  };

  const handleUpdateUser = async (email: string, updates: Partial<User>) => {
    try {
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            const updated = { ...existingUser, ...updates };
            const success = await dbService.upsertUser(updated);
            if (success) {
                setUsers(prev => prev.map(u => u.email === email ? updated : u));
            }
        }
    } catch (e) { 
        alert("Failed to update user."); 
    }
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
            if (e.type === 'add_to_kit') by[key].add++;
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
          if (e.type === 'add_to_cart' || e.type === 'add_to_kit') counts.kitAdd++;
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
            searchSpecificProduct(discoveryQuery).catch(() => [] as Product[]),
            searchEbay(discoveryQuery, 5).catch(() => [] as Product[])
        ]);
        
        const combined = [...ebayResults, ...aiResults.filter(ai => !ebayResults.some(eb => eb.name.toLowerCase() === ai.name.toLowerCase()))];
        setDiscoveryCandidates(combined);
    } catch (e) { 
        alert("Search error."); 
    } finally { 
        setIsSearchingProduct(false); 
    }
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
        onApprove(selectedVideo.id, editProducts, editComplementary, editEpnId, selectedVideo.insights, editTitle, selectedVideo.creatorSubscriptionStatus || currentUser.subscriptionStatus);
        setSelectedVideo(null);
    }
  };

  const handleRejectAction = () => {
    if (selectedVideo) {
        onReject(selectedVideo.id, rejectReason, rejectNote);
        setShowRejectModal(false);
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
    if (!isVerifiedPartner && !isAdmin) return null;

    const partnerName = currentUser.company?.toLowerCase() || currentUser.displayName.toLowerCase();
    const partnerId = currentUser.partnerId;

    const demandVideos = videos.filter(v => 
        v.products.some(p => p.merchantId === partnerId || p.merchantName?.toLowerCase() === partnerName) ||
        v.complementaryProducts?.some(p => p.merchantId === partnerId || p.merchantName?.toLowerCase() === partnerName)
    );

    const partnerEvents = analyticsEvents.filter(e => 
        e.partner?.id === partnerId || e.partner?.name?.toLowerCase() === partnerName
    );

    const funnel = {
        observed: partnerEvents.filter(e => e.type === 'video_view').length,
        planning: partnerEvents.filter(e => e.type === 'add_to_kit').length,
        handoff: partnerEvents.filter(e => e.type === 'source_redirect').length
    };

    return {
        demandVideos,
        funnel
    };
  }, [isVerifiedPartner, isAdmin, currentUser, videos, analyticsEvents]);

  const filteredVideos = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return videos.filter(v => 
        v.title.toLowerCase().includes(q) || 
        v.creator.toLowerCase().includes(q) || 
        v.category.toLowerCase().includes(q)
    );
  }, [videos, searchQuery]);

  const pendingVideos = useMemo(() => {
    return videos.filter(v => v.status === 'pending_review' || v.status === 'curating');
  }, [videos]);

  const filteredUsers = useMemo(() => {
    const q = userSearchQuery.toLowerCase().trim();
    return users.filter(u => 
        u.email.toLowerCase().includes(q) || 
        u.displayName.toLowerCase().includes(q) ||
        (u.company && u.company.toLowerCase().includes(q))
    );
  }, [users, userSearchQuery]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-[#7D8FED]/25 selection:text-white pb-16">
      {/* Upper Navigation Bar */}
      <div className="border-b border-slate-905 bg-slate-950/60 backdrop-blur-xl sticky top-0 z-40 px-6 py-4.5">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                  <button 
                      onClick={onBack} 
                      className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/50 text-slate-400 hover:text-white hover:border-slate-750 transition-all flex items-center justify-center"
                      title="Return"
                  >
                      <ArrowLeftIcon className="w-4 h-4" />
                  </button>
                  <div>
                      <div className="flex items-center gap-1.5 leading-none">
                          <ShieldIcon className="w-3.5 h-3.5 text-[#7D8FED]" />
                          <span className="text-[9px] font-black tracking-widest text-[#7D8FED] uppercase">Control Matrix</span>
                      </div>
                      <h1 className="text-xl font-black text-white tracking-tight mt-1">
                          {isAdmin ? "Standard Command Terminal" : (isVerifiedPartner ? "Verified Partner Suite" : "Creator Ops Hub")}
                      </h1>
                  </div>
              </div>

              {/* Tabs Navigation */}
              <div className="flex flex-wrap items-center bg-slate-900/60 p-1 rounded-2xl border border-slate-800/80 gap-1">
                  {isAdmin && (
                      <>
                          <button 
                              onClick={() => { setActiveTab('pending'); setSelectedVideo(null); }} 
                              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeTab === 'pending' ? 'bg-[#7D8FED] text-white' : 'text-slate-400 hover:text-slate-200'}`}
                          >
                              Queue ({pendingVideos.length})
                          </button>
                          <button 
                              onClick={() => { setActiveTab('library'); setSelectedVideo(null); }} 
                              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'library' ? 'bg-[#7D8FED] text-white' : 'text-slate-400 hover:text-slate-200'}`}
                          >
                              Database
                          </button>
                      </>
                  )}
                  {(isAdmin || isVerifiedPartner || isCreator) && (
                      <button 
                          onClick={() => { setActiveTab('intelligence'); setSelectedVideo(null); }} 
                          className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeTab === 'intelligence' ? 'bg-[#7D8FED] text-white' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                          <BarChartIcon className="w-3.5 h-3.5" /> Intelligence
                      </button>
                  )}
                  {(isAdmin || isVerifiedPartner) && (
                      <button 
                          onClick={() => { setActiveTab('logistics'); setSelectedVideo(null); }} 
                          className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'logistics' ? 'bg-[#7D8FED] text-white' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                          Logistics
                      </button>
                  )}
                  {isAdmin && (
                      <>
                          <button 
                              onClick={() => { setActiveTab('users'); setSelectedVideo(null); }} 
                              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'users' ? 'bg-[#7D8FED] text-white' : 'text-slate-400 hover:text-slate-200'}`}
                          >
                              Users
                          </button>
                          <button 
                              onClick={() => { setActiveTab('reports'); setSelectedVideo(null); }} 
                              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'reports' ? 'bg-[#7D8FED] text-white' : 'text-slate-400 hover:text-slate-200'}`}
                          >
                              Reports ({reports.filter(r => r.status === 'pending').length})
                          </button>
                          <button 
                              onClick={() => { setActiveTab('audit'); setSelectedVideo(null); }} 
                              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'audit' ? 'bg-[#7D8FED] text-white' : 'text-slate-400 hover:text-slate-200'}`}
                          >
                              Audit
                          </button>
                          <button 
                              onClick={() => { setActiveTab('status'); setSelectedVideo(null); }} 
                              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'status' ? 'bg-[#7D8FED] text-white' : 'text-slate-400 hover:text-slate-200'}`}
                          >
                              Status
                          </button>
                      </>
                  )}
              </div>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8">
          
          {/* QUEUE & REVIEW TAB */}
          {activeTab === 'pending' && isAdmin && (
              <div className="space-y-6">
                  {selectedVideo === null ? (
                      <div>
                          <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl mb-6">
                              <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">Review Pending Build Hubs</h3>
                              <p className="text-xs text-slate-500 leading-relaxed">
                                  Found tools or user submitted setups awaiting EPN integration and safety validation before general availability on the public stream list.
                              </p>
                          </div>

                          {pendingVideos.length === 0 ? (
                              <div className="text-center py-24 bg-slate-950 border border-slate-902 border-dashed rounded-[3rem]">
                                  <CheckCircleIcon className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Queue is entirely clear</p>
                                  <p className="text-[10px] text-slate-500 mt-2">All scanned project hubs are published on the feed.</p>
                              </div>
                          ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                  {pendingVideos.map((video) => (
                                      <div key={video.id} className="bg-slate-900 border border-slate-800/80 rounded-[2.5rem] overflow-hidden flex flex-col hover:border-slate-700 transition-all group">
                                          <div className="relative aspect-video bg-slate-950">
                                              <img src={video.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700" alt="" />
                                              <span className="absolute top-4 left-4 text-[7px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg uppercase tracking-widest leading-none">
                                                  Awaiting Spec Review
                                              </span>
                                          </div>
                                          <div className="p-6 flex-grow flex flex-col justify-between">
                                              <div>
                                                  <span className="text-[8px] font-black text-[#7D8FED] uppercase tracking-widest">{video.category}</span>
                                                  <h4 className="text-sm font-black text-white mt-1 group-hover:text-[#7D8FED] transition-colors line-clamp-1 leading-tight">{video.title}</h4>
                                                  <div className="flex items-center gap-1 mt-2">
                                                      <span className="text-[8px] font-black text-slate-400 bg-slate-950 px-2 py-1 rounded">By {video.creator}</span>
                                                      <span className="text-[8px] font-bold text-slate-500">({video.creatorId})</span>
                                                  </div>
                                                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-800/60">
                                                      <div className="text-center bg-slate-950/60 p-2 rounded-xl border border-slate-800/30">
                                                          <p className="text-[14px] font-black text-slate-200">{video.products.length}</p>
                                                          <p className="text-[7.5px] font-black text-slate-500 uppercase tracking-wider mt-0.5">Core Tools</p>
                                                      </div>
                                                      <div className="text-center bg-slate-950/60 p-2 rounded-xl border border-slate-800/30">
                                                          <p className="text-[14px] font-black text-slate-200">{(video.complementaryProducts || []).length}</p>
                                                          <p className="text-[7.5px] font-black text-slate-500 uppercase tracking-wider mt-0.5">Suggested</p>
                                                      </div>
                                                  </div>
                                              </div>
                                              <button 
                                                  onClick={() => handleEditClick(video)} 
                                                  className="w-full mt-6 py-4.5 bg-[#7D8FED] hover:bg-[#6b7be6] text-white text-[9px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-blue-950/10 flex items-center justify-center gap-2"
                                              >
                                                  <PencilIcon className="w-3.5 h-3.5" /> Curate Specs & Approve
                                              </button>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  ) : (
                      /* DETAILED VIDEO TERMINAL VIEW (DRAWER) */
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-scale-in">
                          {/* Left Panel: Preview Metadata */}
                          <div className="lg:col-span-4 space-y-6">
                              <button 
                                  onClick={() => setSelectedVideo(null)} 
                                  className="py-3 px-5 border border-slate-800 bg-slate-900/60 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white flex items-center gap-2 transition-all"
                              >
                                  ← Back to Queue
                              </button>

                              <div className="bg-slate-900 border border-slate-800/80 rounded-[2.5rem] p-6 space-y-5">
                                  <div className="aspect-video rounded-2xl bg-slate-950 overflow-hidden relative">
                                      <img src={selectedVideo.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                                      {selectedVideo.videoUrl ? (
                                          <a 
                                              href={selectedVideo.videoUrl} 
                                              target="_blank" 
                                              rel="noopener noreferrer" 
                                              className="absolute inset-0 bg-slate-950/40 hover:bg-slate-950/10 transition-colors flex items-center justify-center group"
                                          >
                                              <PlayIcon className="w-12 h-12 text-white group-hover:scale-110 transition-transform" />
                                          </a>
                                      ) : null}
                                  </div>

                                  <div>
                                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-none">Reviewing Workspace</p>
                                      <h3 className="text-xl font-black text-white leading-tight mt-1">{selectedVideo.title}</h3>
                                      <p className="text-[10px] font-bold text-[#7D8FED] uppercase tracking-wider mt-1">{selectedVideo.category}</p>
                                  </div>

                                  <div className="space-y-3.5 p-4 bg-slate-950/70 border border-slate-800/70 rounded-2xl">
                                      <div>
                                          <p className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest leading-none">Creator / Submitter</p>
                                          <p className="text-xs font-black text-slate-200 mt-1">{selectedVideo.creator} <span className="text-[9px] text-slate-500 font-bold ml-1">({selectedVideo.creatorId})</span></p>
                                      </div>
                                      <div>
                                          <p className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest leading-none">Subscription Privilege</p>
                                          <span className="inline-block text-[8px] font-black text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-widest mt-1">
                                              {selectedVideo.creatorSubscriptionStatus || 'Pro'} Tier
                                          </span>
                                      </div>
                                  </div>

                                  <div className="space-y-3">
                                      <div className="space-y-1">
                                          <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Modify Title for SEO</label>
                                          <input 
                                              type="text" 
                                              value={editTitle} 
                                              onChange={(e) => setEditTitle(e.target.value)} 
                                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-bold text-white focus:outline-none focus:border-[#7D8FED]" 
                                          />
                                      </div>

                                      <div className="space-y-1">
                                          <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Affiliate EPN Campaign ID</label>
                                          <input 
                                              type="text" 
                                              value={editEpnId} 
                                              onChange={(e) => setEditEpnId(e.target.value)} 
                                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-[#7D8FED] font-bold focus:outline-none focus:border-[#7D8FED]" 
                                          />
                                          <p className="text-[6.5px] font-semibold text-slate-500 uppercase tracking-wide">Defaults to main system campaign code: 5339014523</p>
                                      </div>
                                  </div>

                                  <div className="pt-4 border-t border-slate-800/80 space-y-3.5">
                                      <button 
                                          onClick={handleApproveAction} 
                                          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-1.5"
                                      >
                                          <CheckCircleIcon className="w-4 h-4" /> Approve & Make Public
                                      </button>
                                      <div className="grid grid-cols-2 gap-3">
                                          <button 
                                              onClick={() => setShowRejectModal(true)} 
                                              className="py-3 px-2 bg-slate-950/60 border border-rose-500/25 hover:border-rose-500 text-rose-500 hover:bg-rose-500/5 text-[8.5px] font-black uppercase tracking-widest rounded-xl transition-all"
                                          >
                                              Request Revisions
                                          </button>
                                          <button 
                                              onClick={handleDeleteAction} 
                                              className="py-3 px-2 bg-slate-950/60 border border-slate-800 hover:border-rose-600 text-slate-500 hover:text-rose-500 text-[8.5px] font-black uppercase tracking-widest rounded-xl transition-all"
                                          >
                                              Purge Hub
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          {/* Right Panel: Spec Terminal Editor */}
                          <div className="lg:col-span-8 bg-slate-900 border border-slate-800/80 rounded-[2.5rem] p-6 lg:p-8 space-y-8">
                              {/* 1. DISCOVERY & INJECTION BOX */}
                              <div>
                                  <div className="p-5.5 bg-slate-950 border border-slate-850 rounded-[2rem] space-y-4">
                                      <div className="flex items-center gap-2">
                                          <SparkleIcon className="w-5 h-5 text-[#7D8FED] animate-pulse" />
                                          <div>
                                              <p className="text-[10px] font-black text-white uppercase tracking-wider">Inject Listings Into Specs</p>
                                              <p className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Scours active eBay catalogs and AI records instantaneously</p>
                                          </div>
                                      </div>
                                      
                                      <form onSubmit={handleDiscovery} className="flex gap-2">
                                          <div className="relative flex-grow">
                                              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                              <input 
                                                  type="text" 
                                                  placeholder="Search drill bits, soldering irons, 3D printers..." 
                                                  value={discoveryQuery} 
                                                  onChange={(e) => setDiscoveryQuery(e.target.value)} 
                                                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3.5 pl-11 pr-5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#7D8FED]"
                                              />
                                          </div>
                                          <button 
                                              type="submit" 
                                              disabled={isSearchingProduct} 
                                              className="py-3.5 px-6 bg-[#7D8FED] hover:bg-[#6b7be6] disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                          >
                                              {isSearchingProduct ? 'Searching...' : 'Locate'}
                                          </button>
                                      </form>

                                      {discoveryCandidates.length > 0 && (
                                          <div className="border-t border-slate-904 pt-4 space-y-2.5 max-h-64 overflow-y-auto pr-1">
                                              <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Candidates Found ({discoveryCandidates.length})</p>
                                              {discoveryCandidates.map((cand) => (
                                                  <div key={cand.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition" title="Click inject to add items">
                                                      <div className="flex items-center gap-2.5 min-w-0">
                                                          <img src={cand.imageUrl} className="w-9 h-9 object-cover rounded border border-slate-800" alt="" />
                                                          <div className="min-w-0">
                                                              <p className="text-[10px] font-black text-white uppercase truncate max-w-md">{cand.name}</p>
                                                              <div className="flex items-center gap-2 mt-0.5">
                                                                  <span className="text-[9px] font-semibold text-emerald-500">{formatCurrency(cand.price)}</span>
                                                                  <span className="text-[7.5px] font-bold text-slate-550 uppercase tracking-tight">{cand.retailer}</span>
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <button 
                                                          onClick={() => handleInjectCandidate(cand)} 
                                                          className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[8px] font-black uppercase tracking-wide rounded-md transition"
                                                      >
                                                          Inject Item
                                                      </button>
                                                  </div>
                                              ))}
                                          </div>
                                      )}
                                  </div>
                              </div>

                              {/* 2. CORE PRODUCTS LIST */}
                              <div className="space-y-4">
                                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                                      <span className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                                          Core Tools & Materials Spec ({editProducts.length})
                                      </span>
                                  </div>
                                  {editProducts.map((p) => (
                                      <div key={p.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-start gap-4 group">
                                          <img src={p.imageUrl} className="w-16 h-16 rounded-xl object-cover border border-slate-800/80 shadow-md flex-shrink-0 bg-slate-900 transition-transform group-hover:scale-105" alt="" />
                                          <div className="flex-grow min-w-0 space-y-1.5">
                                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                                  <p className="text-xs font-black text-white leading-snug break-words pr-1 max-w-sm">{p.name}</p>
                                                  {p.isCreatorDeclared ? (
                                                      <span className="text-[7px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Creator Declared</span>
                                                  ) : (
                                                      <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">Scanned</span>
                                                  )}
                                              </div>
                                              <div className="flex flex-wrap items-center gap-3 mt-1">
                                                  <span className="text-[9px] font-bold text-emerald-400">{formatCurrency(p.price)}</span>
                                                  <span className="text-[8px] font-black text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded uppercase tracking-widest">{p.retailer}</span>
                                                  {p.purchaseUrl && p.purchaseUrl !== '#' && (
                                                      <a 
                                                          href={p.purchaseUrl} 
                                                          target="_blank" 
                                                          rel="noopener noreferrer" 
                                                          className="text-[8px] font-black uppercase text-[#7D8FED] hover:underline flex items-center gap-1"
                                                      >
                                                          Inspect Listing ↗
                                                      </a>
                                                  )}
                                              </div>
                                              {p.description && (
                                                  <p className="text-[8.5px] text-slate-500 mt-1.5 italic line-clamp-2 leading-relaxed">{p.description}</p>
                                              )}
                                              {canDeclare && (
                                                  <div className="mt-2.5 flex items-center gap-2">
                                                      <button 
                                                          onClick={() => {
                                                              const updated = editProducts.map(item => item.id === p.id ? {...item, isCreatorDeclared: !item.isCreatorDeclared} : item);
                                                              setEditProducts(updated);
                                                          }} 
                                                          className={`px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded border transition-all ${
                                                              p.isCreatorDeclared 
                                                                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                                                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                                          }`}
                                                      >
                                                          {p.isCreatorDeclared ? 'Declared Verified' : 'Mark Creator Declared'}
                                                      </button>
                                                  </div>
                                              )}
                                          </div>
                                          <button onClick={() => handleRemoveProduct(p.id, false)} className="p-3 text-slate-700 hover:text-rose-500 hover:bg-rose-500/5 rounded-xl transition-all self-center">
                                              <TrashIcon className="w-4 h-4" />
                                          </button>
                                      </div>
                                  ))}
                              </div>

                              {/* 3. COMPLEMENTARY PRODUCTS LIST */}
                              <div className="space-y-4">
                                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                                      <span className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                                          Complementary Kit Recommendations ({(editComplementary || []).length})
                                      </span>
                                  </div>
                                  {editComplementary.map((p) => (
                                      <div key={p.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-start gap-4 group">
                                          <img src={p.imageUrl} className="w-16 h-16 rounded-xl object-cover border border-slate-800/80 shadow-md flex-shrink-0 bg-slate-900 transition-transform group-hover:scale-105" alt="" />
                                          <div className="flex-grow min-w-0 space-y-1.5">
                                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                                  <p className="text-xs font-black text-white leading-snug break-words pr-1 max-w-sm">{p.name}</p>
                                                  <span className="text-[7px] font-black text-[#7D8FED] uppercase tracking-widest bg-[#7D8FED]/10 px-1.5 py-0.5 rounded border border-[#7D8FED]/20">Suggested</span>
                                              </div>
                                              <div className="flex flex-wrap items-center gap-3 mt-1">
                                                  <span className="text-[9px] font-bold text-emerald-400">{formatCurrency(p.price)}</span>
                                                  <span className="text-[8px] font-black text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded uppercase tracking-widest">{p.retailer}</span>
                                                  {p.purchaseUrl && p.purchaseUrl !== '#' && (
                                                      <a 
                                                          href={p.purchaseUrl} 
                                                          target="_blank" 
                                                          rel="noopener noreferrer" 
                                                          className="text-[8px] font-black uppercase text-[#7D8FED] hover:underline flex items-center gap-1"
                                                      >
                                                          Inspect Listing ↗
                                                      </a>
                                                  )}
                                              </div>
                                              {p.description && (
                                                  <p className="text-[8.5px] text-slate-500 mt-1.5 italic line-clamp-2 leading-relaxed">{p.description}</p>
                                              )}
                                          </div>
                                          <button onClick={() => handleRemoveProduct(p.id, true)} className="p-3 text-slate-700 hover:text-rose-500 hover:bg-rose-500/5 rounded-xl transition-all self-center">
                                              <TrashIcon className="w-4 h-4" />
                                          </button>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          )}

          {/* MASTER DATABASE LIST TAB */}
          {activeTab === 'library' && isAdmin && (
              <div className="space-y-6">
                  <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                          <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">Central Library Inventory</h3>
                          <p className="text-xs text-slate-500 leading-relaxed">Publish, inspect, unpublish, or eliminate build guides permanently on the public index.</p>
                      </div>
                      <div className="relative w-full sm:w-80">
                          <SearchIcon className="absolute left-4.5 top-1/2 -get-translation -translate-y-1/2 text-slate-500 w-4 h-4" />
                          <input 
                              type="text" 
                              placeholder="Fuzzy search library..." 
                              value={searchQuery} 
                              onChange={(e) => setSearchQuery(e.target.value)} 
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-11 pr-5 text-xs text-white focus:outline-none focus:border-[#7D8FED]"
                          />
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredVideos.map((video) => (
                          <div key={video.id} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-5 flex flex-col justify-between hover:border-slate-700 transition">
                              <div>
                                  <div className="flex justify-between items-start gap-4">
                                      <div>
                                          <span className="text-[8px] font-black text-[#7D8FED] uppercase tracking-widest">{video.category}</span>
                                          <h4 className="text-sm font-black text-white leading-tight mt-1 line-clamp-1">{video.title}</h4>
                                          <span className="inline-block text-[7.5px] font-black text-slate-500 uppercase tracking-widest leading-none mt-2">By {video.creator} ({video.creatorId})</span>
                                      </div>
                                      <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded leading-none ${
                                          video.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                      }`}>
                                          {video.status}
                                      </span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                                      <div className="bg-slate-950/60 p-2 rounded-xl text-[12px] font-black">
                                          {video.products.length}
                                          <p className="text-[7px] text-slate-500 uppercase">Core</p>
                                      </div>
                                      <div className="bg-slate-950/60 p-2 rounded-xl text-[12px] font-black">
                                          {video?.stats?.views || 0}
                                          <p className="text-[7px] text-slate-500 uppercase">Views</p>
                                      </div>
                                      <div className="bg-slate-950/60 p-2 rounded-xl text-[12px] font-black">
                                          {video?.stats?.clicks || 0}
                                          <p className="text-[7px] text-slate-500 uppercase">Clicks</p>
                                      </div>
                                  </div>
                              </div>
                              <div className="flex gap-2 mt-5">
                                  <button 
                                      onClick={() => handleEditClick(video)} 
                                      className="flex-grow py-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 text-[8px] font-black uppercase tracking-widest rounded-xl transition"
                                  >
                                      Specs Overhaul
                                  </button>
                                  {video.status === 'published' ? (
                                      <button 
                                          onClick={async () => {
                                              await dbService.updateVideoStatus(video.id, 'curating');
                                              window.location.reload();
                                          }} 
                                          className="px-4 py-3 border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-widest rounded-xl transition"
                                      >
                                          Unpublish
                                      </button>
                                  ) : (
                                      <button 
                                          onClick={async () => {
                                              await dbService.updateVideoStatus(video.id, 'published');
                                              window.location.reload();
                                          }} 
                                          className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest rounded-xl transition animate-pulse"
                                      >
                                          Publish
                                      </button>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* INTELLIGENCE METRIC DASHBOARD */}
          {activeTab === 'intelligence' && (
              <div className="space-y-8">
                  {/* METRICS ROW */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 flex items-center gap-4.5">
                          <span className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                              <DollarSignIcon className="w-6 h-6" />
                          </span>
                          <div>
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Gross Sales Val</span>
                              <p className="text-xl font-black text-white mt-1 leading-none">{formatCurrency(enterpriseStats.totalSalesValue)}</p>
                          </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 flex items-center gap-4.5">
                          <span className="p-3 bg-[#7D8FED]/10 text-[#7D8FED] rounded-2xl border border-[#7D8FED]/20">
                              <EyeIcon className="w-6 h-6" />
                          </span>
                          <div>
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Interactive Views</span>
                              <p className="text-xl font-black text-white mt-1 leading-none">{funnelStats.views.toLocaleString()}</p>
                          </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 flex items-center gap-4.5">
                          <span className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20">
                              <PackagePlusIcon className="w-6 h-6" />
                          </span>
                          <div>
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Kits Constructed</span>
                              <p className="text-xl font-black text-white mt-1 leading-none">{funnelStats.kitAdd.toLocaleString()}</p>
                          </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 flex items-center gap-4.5">
                          <span className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
                              <MousePointerClickIcon className="w-6 h-6" />
                          </span>
                          <div>
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Merchant Clicks</span>
                              <p className="text-xl font-black text-white mt-1 leading-none">{funnelStats.sourceRedirect.toLocaleString()}</p>
                          </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Top Selling Tools */}
                      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 lg:p-8 space-y-6">
                          <div>
                              <h3 className="text-sm font-black text-white uppercase tracking-wider">Top Performing Tools</h3>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5 font-bold">Catalog inventory ranked by click-through sales value</p>
                          </div>
                          <div className="space-y-4">
                              {enterpriseStats.topSKUs.length === 0 ? (
                                  <p className="text-xs text-slate-500 italic py-8">Waiting for first user purchase click...</p>
                              ) : (
                                  enterpriseStats.topSKUs.map((sku, index) => (
                                      <div key={index} className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-2xl">
                                          <div className="flex items-center gap-3 min-w-0">
                                              <img src={sku.img} className="w-10 h-10 object-cover rounded-lg border border-slate-800" alt="" />
                                              <div className="min-w-0">
                                                  <p className="text-xs font-black text-white uppercase truncate max-w-sm">{sku.name}</p>
                                                  <p className="text-[8px] text-slate-400 uppercase tracking-wider mt-0.5">{sku.sales} times chosen</p>
                                              </div>
                                          </div>
                                          <span className="text-xs font-black text-emerald-400 font-mono">{formatCurrency(sku.revenue)}</span>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>

                      {/* Top Yielding Build Channels */}
                      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 lg:p-8 space-y-6">
                          <div>
                              <h3 className="text-sm font-black text-white uppercase tracking-wider">Top Creator Hubs</h3>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5 font-bold">Build feeds with the highest shopper engagement rate</p>
                          </div>
                          <div className="space-y-4">
                              {enterpriseStats.topVideos.length === 0 ? (
                                  <p className="text-xs text-slate-500 italic py-8">Awaiting purchase interactions...</p>
                              ) : (
                                  enterpriseStats.topVideos.map((vid, index) => (
                                      <div key={index} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex justify-between items-center">
                                          <div>
                                              <p className="text-xs font-black text-white uppercase truncate max-w-sm">{vid.title}</p>
                                              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide mt-1">Creator: {vid.creator}</p>
                                          </div>
                                          <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                                              {vid.sales} checkout signals
                                          </span>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* LOGISTICS & PARTNER COUPLING TAB */}
          {activeTab === 'logistics' && (isAdmin || isVerifiedPartner) && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Split overview */}
                  <div className="lg:col-span-4 space-y-6">
                      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 space-y-4">
                          <div className="flex items-center justify-between">
                              <h3 className="text-sm font-black text-white uppercase tracking-wider">Partner Demands</h3>
                              <button 
                                  onClick={handleExportPartnerCSV} 
                                  className="p-2 border border-slate-800 hover:text-white bg-slate-950 hover:bg-slate-900 rounded-xl transition text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5"
                              >
                                  <FileTextIcon className="w-3.5 h-3.5" /> Export Demand CSV
                              </button>
                          </div>

                          <div className="space-y-4.5 pt-2">
                              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-3">
                                  <span className="text-[8px] font-black tracking-widest text-[#7D8FED] uppercase">Affiliate Split</span>
                                  <div className="grid grid-cols-2 gap-2 mt-1">
                                      <div>
                                          <p className="text-[7.5px] font-black text-slate-500 uppercase">Interactive Views</p>
                                          <p className="text-[17px] font-black text-white mt-0.5">{partnerSplit.affil.views}</p>
                                      </div>
                                      <div>
                                          <p className="text-[7.5px] font-black text-slate-500 uppercase">Conversion (GMV)</p>
                                          <p className="text-[17px] font-black text-emerald-400 mt-0.5 font-mono">{formatCurrency(partnerSplit.affil.gmv)}</p>
                                      </div>
                                  </div>
                              </div>

                              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-3">
                                  <span className="text-[8px] font-black tracking-widest text-amber-500 uppercase">Integrated Merchant Marketplace</span>
                                  <div className="grid grid-cols-2 gap-2 mt-1">
                                      <div>
                                          <p className="text-[7.5px] font-black text-slate-500 uppercase">Route Redirects</p>
                                          <p className="text-[17px] font-black text-white mt-0.5">{partnerSplit.merchant.redirect}</p>
                                      </div>
                                      <div>
                                          <p className="text-[7.5px] font-black text-slate-500 uppercase">Conversion Ratio</p>
                                          <p className="text-[17px] font-black text-amber-500 mt-0.5 font-mono">{partnerSplit.merchant.conv.toFixed(1)}%</p>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Manual integration health checking */}
                      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 space-y-3">
                          <h4 className="text-[10px] font-black text-white uppercase tracking-wider mb-2">Live Coupling Sync Status</h4>
                          <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-850 rounded-xl">
                              <div>
                                  <p className="text-xs font-black text-white">Merchant Catalog Database</p>
                                  <p className="text-[8px] font-black tracking-wider text-slate-500 uppercase mt-0.5">Last update: {lastSyncTime.split('T')[0]}</p>
                              </div>
                              <button 
                                  onClick={handleForceSync} 
                                  disabled={isSyncing} 
                                  className="p-2 border border-slate-800 hover:text-white rounded-xl bg-slate-900 flex items-center justify-center transition disabled:opacity-40"
                              >
                                  <RefreshCwIcon className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#7D8FED]' : 'text-slate-400'}`} />
                              </button>
                          </div>
                      </div>
                  </div>

                  {/* List of Coupling Partners demand catalogs */}
                  <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 lg:p-8 space-y-6">
                      <div>
                          <h3 className="text-sm font-black text-white uppercase tracking-wider">Demand Catalog Coupled Kits</h3>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Build guides utilizing your certified listings or registered brand inventory</p>
                      </div>

                      {partnerIntelligence?.demandVideos.length === 0 ? (
                          <div className="py-20 text-center bg-slate-950/40 rounded-2xl border border-slate-800 border-dashed">
                              <p className="text-xs text-slate-500 italic uppercase tracking-wider">No active build guides are currently binding your listings.</p>
                          </div>
                      ) : (
                          <div className="space-y-4.5">
                              {partnerIntelligence?.demandVideos.map((v) => (
                                  <div key={v.id} className="p-4 bg-slate-950 border border-slate-801 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                      <div>
                                          <p className="text-xs font-black text-white uppercase truncate max-w-lg">{v.title}</p>
                                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                              <span className="text-[7.5px] font-black text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded uppercase tracking-wider">{v.category}</span>
                                              <span className="text-[7.5px] font-black text-indigo-400 bg-indigo-500/10 border border-[#7D8FED]/20 px-2 py-0.5 rounded uppercase tracking-wider leading-none">Difficulty: {v.insights?.difficulty || 'N/A'}</span>
                                              <span className="text-[7.5px] font-black text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded leading-none">{v.insights?.costEstimate?.budgetTotal || 'N/A'}</span>
                                          </div>
                                      </div>
                                      <button 
                                          onClick={() => handleEditClick(v)} 
                                          className="py-2.5 px-4.5 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 text-[8px] font-black tracking-widest uppercase rounded-xl transition"
                                      >
                                          Inspect Specs
                                      </button>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          )}

          {/* USERS ACCESS LEVEL CONTROL TAB */}
          {activeTab === 'users' && isAdmin && (
              <div className="space-y-6">
                  <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div>
                          <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">Access & Permissions Matrix</h3>
                          <p className="text-xs text-slate-500 leading-relaxed">Upgrade subscriptions or grant partner verification to maker accounts.</p>
                      </div>
                      <div className="relative w-full sm:w-80">
                          <SearchIcon className="absolute left-4.5 top-1/2 -get-translation -translate-y-1/2 text-slate-500 w-4 h-4" />
                          <input 
                              type="text" 
                              placeholder="Fuzzy search email or name..." 
                              value={userSearchQuery} 
                              onChange={(e) => setUserSearchQuery(e.target.value)} 
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-11 pr-5 text-xs text-white focus:outline-none focus:border-[#7D8FED]"
                          />
                      </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden">
                      <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                              <thead>
                                  <tr className="border-b border-slate-820 bg-slate-950 text-[8.5px] font-black tracking-widest text-slate-500 uppercase">
                                      <th className="py-4.5 px-6">User / Maker Spec</th>
                                      <th className="py-4.5 px-6">Access Level</th>
                                      <th className="py-4.5 px-6">Gamified Tracking</th>
                                      <th className="py-4.5 px-6">Role & Coupling</th>
                                      <th className="py-4.5 px-6">Platform Actions</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-840/50 text-xs">
                                  {filteredUsers.map((user) => (
                                      <tr key={user.email} className="hover:bg-slate-955 transition-colors">
                                          <td className="py-4.5 px-6">
                                              <div className="flex items-center gap-3">
                                                  <div className="w-9 h-9 rounded-full bg-[#7D8FED]/10 border border-[#7D8FED]/20 flex items-center justify-center font-bold text-white uppercase text-[10px]">
                                                      {user.displayName?.charAt(0) || 'U'}
                                                  </div>
                                                  <div>
                                                      <p className="font-black text-white leading-snug">{user.displayName}</p>
                                                      <p className="text-[10px] text-slate-500 font-bold">{user.email}</p>
                                                  </div>
                                              </div>
                                          </td>
                                          <td className="py-4.5 px-6">
                                              <select 
                                                  value={user.subscriptionStatus || 'Free'} 
                                                  onChange={(e) => handleUpdateUser(user.email, { subscriptionStatus: e.target.value as any })} 
                                                  className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] font-black text-[#7D8FED] uppercase tracking-wider focus:outline-none"
                                              >
                                                  <option value="Free">Free Tier</option>
                                                  <option value="Plus">Plus Tier</option>
                                                  <option value="Pro">Pro Premium</option>
                                                  <option value="Studio">Studio Enterprise</option>
                                              </select>
                                          </td>
                                          <td className="py-4.5 px-6">
                                              <button 
                                                  onClick={() => handleUpdateUser(user.email, { gamificationEnabled: !user.gamificationEnabled })} 
                                                  className={`px-3 py-1 text-[8.5px] font-black uppercase tracking-wider rounded border transition ${
                                                      user.gamificationEnabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-950 text-slate-500 border-slate-800'
                                                  }`}
                                              >
                                                  {user.gamificationEnabled ? 'Enabled (XP Active)' : 'Disabled'}
                                              </button>
                                          </td>
                                          <td className="py-4.5 px-6 space-y-1">
                                              <div className="flex items-center gap-1.5">
                                                  <span className="text-[7.5px] font-black text-slate-500 uppercase">Admin:</span>
                                                  <button 
                                                      onClick={() => handleUpdateUser(user.email, { isAdmin: !user.isAdmin })} 
                                                      className={`px-2 py-0.5 text-[7px] font-black uppercase rounded ${user.isAdmin ? 'bg-red-500/10 text-red-500' : 'bg-slate-950 text-slate-600 border border-slate-800'}`}
                                                  >
                                                      {user.isAdmin ? 'SYS_ADMIN' : 'NO'}
                                                  </button>
                                              </div>
                                              <div className="flex items-center gap-1.5">
                                                  <span className="text-[7.5px] font-black text-slate-500 uppercase">Partner:</span>
                                                  <button 
                                                      onClick={() => handleUpdateUser(user.email, { isVerifiedPartner: !user.isVerifiedPartner })} 
                                                      className={`px-2 py-0.5 text-[7px] font-black uppercase rounded ${user.isVerifiedPartner ? 'bg-[#7D8FED]/10 text-[#7D8FED]' : 'bg-slate-950 text-slate-600 border border-slate-800'}`}
                                                  >
                                                      {user.isVerifiedPartner ? 'VERIFIED' : 'NO'}
                                                  </button>
                                              </div>
                                          </td>
                                          <td className="py-4.5 px-6">
                                              <button 
                                                  onClick={() => {
                                                      const updatedBio = window.prompt("Adjust bio description:", user.bio || '');
                                                      if (updatedBio !== null) handleUpdateUser(user.email, { bio: updatedBio });
                                                  }} 
                                                  className="text-[9px] font-black text-[#7D8FED] hover:underline uppercase tracking-wide border border-indigo-500/10 hover:border-indigo-500/30 px-3 py-1.5 rounded bg-indigo-500/5"
                                              >
                                                  Manage Info
                                              </button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          )}

          {/* REPORTS COMPLAINTS QUEUE TAB */}
          {activeTab === 'reports' && isAdmin && (
              <div className="space-y-6">
                  <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl">
                      <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">Comptroller Project Reports</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">Safety disputes, missing tools or broken steps issued by the builder community.</p>
                  </div>

                  {reports.length === 0 ? (
                      <div className="py-20 text-center bg-slate-950 border border-slate-800 rounded-[2.5rem] border-dashed">
                          <CheckCircleIcon className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                          <p className="text-xs font-black uppercase text-slate-400 tracking-widest">No Active dispute reports</p>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          {reports.map((r) => (
                              <div key={r.id} className="p-5 bg-slate-900 border border-slate-800 rounded-[2rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-700 transition">
                                  <div className="space-y-2 max-w-3xl">
                                      <div className="flex items-center gap-2">
                                          <span className={`text-[7px] font-black px-2 py-0.5 rounded uppercase tracking-widest font-mono ${
                                              r.category === 'safety_concern' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-[#7D8FED]/10 text-[#7D8FED]'
                                          }`}>
                                              {r.category}
                                          </span>
                                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{r.status}</span>
                                      </div>
                                      <h4 className="text-sm font-black text-white">{r.projectTitle} <span className="text-[10px] text-slate-500 font-bold font-mono ml-1">Video_ID: {r.videoId}</span></h4>
                                      <p className="text-xs text-slate-300 italic">"{r.description}"</p>
                                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mt-1.5">Submitted by: {r.reporterEmail} at {r.timestamp?.slice(0,10)}</p>
                                  </div>
                                  {r.status === 'pending' && (
                                      <button 
                                          onClick={() => handleResolveReport(r.id)} 
                                          className="flex-shrink-0 px-4.5 py-3 bg-emerald-600 hover:bg-emerald-500 font-black text-white text-[9px] uppercase tracking-widest rounded-xl transition shadow"
                                      >
                                          Mark Resolved
                                      </button>
                                  )}
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          )}

          {/* AUDIT LOG WINDOW TAB */}
          {activeTab === 'audit' && isAdmin && (
              <div className="space-y-6">
                  <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl">
                      <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">Administrative Audit History</h3>
                      <p className="text-xs text-slate-500 leading-relaxed text-left">Immutable sequence record logs tracking site parameters deployment and reviews.</p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 max-h-165 overflow-y-auto space-y-3.5">
                      {auditTrail.length === 0 ? (
                          <p className="text-xs text-slate-500 italic py-10 text-center">Empty ledger trail...</p>
                      ) : (
                          auditTrail.map((log, index) => (
                              <div key={index} className="p-4 bg-slate-950 border border-slate-850 rounded-2xl text-[10.5px] flex items-center justify-between gap-4 font-mono leading-relaxed">
                                  <div className="min-w-0 pr-2">
                                      <span className="text-[#7D8FED] font-black uppercase tracking-wider mr-1.5">{log.action || 'Deploy'}</span>
                                      <span className="text-slate-300">{log.userEmail} ({log.userId})</span>
                                      {log.metadata && (
                                          <p className="text-[8.5px] text-slate-500 mt-1 uppercase">Meta: {JSON.stringify(log.metadata)}</p>
                                      )}
                                  </div>
                                  <span className="text-slate-550 flex-shrink-0 text-[9px] font-black">{log.timestamp ? log.timestamp.split('T')[0] : 'N/A'}</span>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          )}

          {/* SYSTEM LIVE API HEALTH STATUS TAB */}
          {activeTab === 'status' && isAdmin && (
              <div className="space-y-6 animate-fade-in text-left">
                  <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl">
                      <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2 font-sans">Platform API Diagnostic Interface</h3>
                      <p className="text-xs text-slate-500 leading-relaxed font-sans">Live check stats pinging linked merchant directories and backend gateways.</p>
                  </div>

                  {systemStatus ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-mono text-[10.5px]">
                          <div className="p-6 bg-slate-900 border border-slate-800 rounded-[2rem] space-y-4">
                              <h4 className="text-xs font-black text-white font-sans uppercase tracking-widest">Base Layer Connectivity</h4>
                              <div className="space-y-2">
                                  <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                                      <span>Local Storage Buffer:</span>
                                      <span className="text-emerald-500 font-black">STABLE (100%)</span>
                                  </div>
                                  <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                                      <span>Cloud SQL Endpoint:</span>
                                      <span className={systemStatus.dbConnected ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"}>
                                          {systemStatus.dbConnected ? "ONLINE" : "PENDING"}
                                      </span>
                                  </div>
                                  <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                                      <span>Secure Key Enigmas:</span>
                                      <span className={systemStatus.mongoUriOk ? "text-emerald-500 font-bold" : "text-red-500 font-bold"}>
                                          {systemStatus.mongoUriOk ? "ENCRYPTED" : "MISSING"}
                                      </span>
                                  </div>
                              </div>
                          </div>

                          <div className="p-6 bg-slate-900 border border-slate-800 rounded-[2rem] space-y-4">
                              <h4 className="text-xs font-black text-white font-sans uppercase tracking-widest">External Merchant APIs</h4>
                              <div className="space-y-2">
                                  <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                                      <span>Gemini Studio GenAI:</span>
                                      <span className={systemStatus.geminiOk ? "text-emerald-500 font-bold" : "text-red-500 font-bold"}>
                                          {systemStatus.geminiOk ? "COUPLED" : "RESTRICTED"}
                                      </span>
                                  </div>
                                  <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                                      <span>eBay Buy Browse Catalog:</span>
                                      <span className={systemStatus.ebayOk ? "text-emerald-500 font-bold" : "text-red-500 font-bold"}>
                                          {systemStatus.ebayOk ? "AUTHORIZED" : "EXPIRED"}
                                      </span>
                                  </div>
                                  <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                                      <span>Stripe checkout:</span>
                                      <span className={systemStatus.stripeOk ? "text-emerald-500 font-bold" : "text-red-500 font-bold"}>
                                          {systemStatus.stripeOk ? "SYNCHRONIZED" : "STALE"}
                                      </span>
                                  </div>
                              </div>
                          </div>

                          <div className="p-6 bg-slate-900 border border-slate-800 rounded-[2rem] space-y-4">
                              <h4 className="text-xs font-black text-white font-sans uppercase tracking-widest">Telemetry Indicators</h4>
                              <div className="space-y-2">
                                  <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                                      <span>Uptime:</span>
                                      <span className="text-emerald-400 font-bold">{Math.round(systemStatus.uptime || 0).toLocaleString()} SEC</span>
                                  </div>
                                  <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                                      <span>Framework Build:</span>
                                      <span className="text-slate-400">watch1do1_pro_{systemStatus.version || "v2.5.3"}</span>
                                  </div>
                                  <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                                      <span>Creator Notification:</span>
                                      <span className={systemStatus.resendOk ? "text-emerald-500 font-bold" : "text-slate-500 font-bold"}>
                                          {systemStatus.resendOk ? "RESEND_ACTIVE" : "STANDBY"}
                                      </span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  ) : (
                      <div className="py-20 text-center bg-slate-900 border border-slate-800 rounded-[2.5rem]">
                          <RefreshCwIcon className="w-10 h-10 animate-spin text-[#7D8FED] mx-auto mb-4" />
                          <p className="text-xs text-slate-500 uppercase tracking-widest">Running ping diagnostic sequence...</p>
                      </div>
                  )}
              </div>
          )}
      </div>

      {/* REJECTION DETAIL MODAL */}
      {showRejectModal && selectedVideo && (
          <div className="fixed inset-0 z-50 bg-[#020617]/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in font-sans">
              <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 lg:p-8 max-w-md w-full shadow-2xl space-y-5 animate-scale-in">
                  <div>
                      <h4 className="text-lg font-black text-white tracking-tight">Flags Refinement Setup</h4>
                      <p className="text-xs text-slate-550 uppercase tracking-wide mt-1">Specify guidelines for creator review response sync.</p>
                  </div>

                  <div className="space-y-3.5">
                      <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Classification Group</label>
                          <select 
                              value={rejectReason} 
                              onChange={(e) => setRejectReason(e.target.value)} 
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none"
                          >
                              <option value="Content Standards">Content Standards</option>
                              <option value="Unvouchered Out-of-Stock Listings">Unvouchered Out-of-Stock Listings</option>
                              <option value="Erroneous Safety Protocols">Erroneous Safety Protocols</option>
                              <option value="Mismatched Specs">Mismatched Specs</option>
                              <option value="Low Audio-Visual Quality text font">Low Audio-Visual Quality Text Font</option>
                          </select>
                      </div>

                      <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Dis dispute curator notes for the email</label>
                          <textarea 
                              value={rejectNote} 
                              onChange={(e) => setRejectNote(e.target.value)} 
                              rows={4} 
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 placeholder-slate-700 focus:outline-none focus:border-rose-500" 
                              placeholder="Describe which tools or safety steps need adjustment before publication..."
                          />
                      </div>
                  </div>

                  <div className="flex justify-end gap-3.5 pt-2">
                      <button 
                          onClick={() => { setShowRejectModal(false); }} 
                          className="px-4 py-2 text-xs font-black text-slate-400 uppercase tracking-wider hover:text-white"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={handleRejectAction} 
                          className="px-5.5 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl shadow-rose-950/10"
                      >
                          Issue Flags Review
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminDashboard;
