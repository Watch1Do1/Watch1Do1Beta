
import React, { useState, useEffect, useRef, useMemo, Component, ReactNode } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import VideoCard from './components/VideoCard';
import UploadModal from './components/UploadModal';
import AnalyzeModal from './components/AnalyzeModal';
import VideoPlayerView from './components/VideoPlayerView';
import DirectTipModal from './components/DirectTipModal';
import AuthModal from './components/AuthModal';
import ProfilePage from './components/ProfilePage';
import ManageSubscriptionModal from './components/ManageSubscriptionModal';
import PlanningKitPanel from './components/PlanningKitPanel';
import NoResultsAnalysis from './components/NoResultsAnalysis';
import AdminDashboard from './components/AdminDashboard';
import DebugTrackingPanel from './components/DebugTrackingPanel';
import SourcingRedirectModal from './components/SourcingRedirectModal';
import EmailKitModal from './components/EmailKitModal';
import ShareModal from './components/ShareModal';
import SupportModal from './components/SupportModal';
import ResetPasswordPage from './components/ResetPasswordPage';
import ContactUs from './components/ContactUs';
import AboutUs from './components/AboutUs';
import TermsOfService from './components/TermsOfService';
import PrivacyPolicy from './components/PrivacyPolicy';
import AffiliateDisclosure from './components/AffiliateDisclosure';
import AffiliateGuide from './components/AffiliateGuide';
import { 
    generateProductsFromText, 
    generateProductsFromImages, 
    generateComplementaryProducts, 
    generateProductsFromUrl,
    generateV3ProjectInsights
} from './services/geminiService';
import { dbService } from './services/dbService';
import { stripeService } from './services/stripeService';
import { emailService } from './services/emailService';
import { UploadType } from './types';
import { APP_CONFIG } from './constants';
import type { Video, User, Product, CartItem, ProjectInsights, ProjectCategory, SubscriptionStatus, MakerRank, VideoStatus } from './types';
import { SparkleIcon, SearchIcon, CategoryIcon, ChevronDownIcon, RefreshCwIcon, MedalIcon, CameraIcon, DollarSignIcon, ExternalLinkIcon, CheckCircleIcon, CloseIcon, ShareIcon } from './components/IconComponents';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

const LOADING_MESSAGES = [
    "Scanning transcript for mentioned tools...",
    "Spotting materials in the frames...",
    "Searching merchant inventory...",
    "Performing V3 Cost Estimation...",
    "Running Halsted Safety Sweep...",
    "Building your custom project studio..."
];

const CATEGORIES: ProjectCategory[] = [
  'Home Improvement', 'DIY Crafts', 'Cooking & Kitchen', 'Gardening', 
  'Tech & Gadgets', 'Fitness & Sports', 'Automotive', 'Fashion & Beauty', 
  'Kids & Toys', 'Survival & Outdoors', 'Music', 'Pets & Animal Care', 
  'Art & Photography', 'Hobbies', 'Other'
];

const STRIPE_SUPPORT_LINK = "https://buy.stripe.com/fZufZj1l42mg3hy6U7eQM00";

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => { resolve((reader.result as string).split(',')[1]); };
      reader.onerror = (error) => reject(error);
    });
};

const generateVideoThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.onloadeddata = () => { video.currentTime = 1; };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/jpeg')); }
        else { resolve(`https://picsum.photos/seed/${encodeURIComponent(file.name)}/600/400`); }
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => { resolve(`https://picsum.photos/seed/${encodeURIComponent(file.name)}/600/400`); URL.revokeObjectURL(video.src); };
    });
};

const App: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [isAnalyzeModalOpen, setAnalyzeModalOpen] = useState(false);
  const [analyzeModalInitialTab, setAnalyzeModalInitialTab] = useState<UploadType>(UploadType.YOUTUBE);
  const [isTipModalOpen, setTipModalOpen] = useState(false);
  const [isManageSubscriptionModalOpen, setManageSubscriptionModalOpen] = useState(false);
  const [isShareModalOpen, setShareModalOpen] = useState(false);
  const [isSupportModalOpen, setSupportModalOpen] = useState(false);
  const [shareData, setShareData] = useState<{video: Video, isCreator: boolean} | null>(null);
  const [isDebugPanelOpen, setDebugPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isInitialLoading, setInitialLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory | 'All'>('All');
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [view, setView] = useState<'home' | 'videoPlayer' | 'profile' | 'admin' | 'about' | 'terms' | 'privacy' | 'disclosure' | 'contact' | 'affiliateGuide' | 'reset-password'>('home');
  const [profileInitialTab, setProfileInitialTab] = useState<any>('overview');
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | 'forgot-password' | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [planningKit, setPlanningKit] = useState<CartItem[]>([]);
  const [isKitPanelOpen, setKitPanelOpen] = useState(false);
  const [xpNotification, setXpNotification] = useState<{ amount: number; label: string } | null>(null);
  const [sourcingKit, setSourcingKit] = useState<CartItem[]>([]);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState<{ type: UploadType, val: File[] | string, cat: ProjectCategory } | null>(null);
  
  const loadingIntervalRef = useRef<number | null>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
            setIsCategoryMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigateHome = () => {
    setView('home');
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedVideo(null);
    setProfileInitialTab('overview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    handleNavigateHome();
  };

  const hasInteraction = useMemo(() => {
    return searchQuery.trim().length > 0 || selectedCategory !== 'All';
  }, [searchQuery, selectedCategory]);

  const filteredVideos = useMemo(() => {
    if (!Array.isArray(videos)) return [];
    const query = (searchQuery || '').toLowerCase().trim();
    return videos.filter(v => {
        if (!v) return false;
        const matchesStatus = v.status === 'published';
        const matchesQuery = !query || 
            (v.title || '').toLowerCase().includes(query) || 
            (v.creator || '').toLowerCase().includes(query) || 
            (v.category || '').toLowerCase().includes(query);
        const matchesCategory = selectedCategory === 'All' || v.category === selectedCategory;
        
        // Only show internal videos in the main feed unless searching
        const isInternal = v.sourceType !== 'external';
        const shouldShow = isInternal || (query.length > 0);
        
        return matchesStatus && matchesQuery && matchesCategory && shouldShow;
    });
  }, [videos, searchQuery, selectedCategory]);

  const trackEvent = (eventName: string, properties: Record<string, any> = {}) => { 
    if (eventName === 'product_link_click' || eventName === 'ebay_link_click') {
        dbService.logEvent({ 
            type: 'product_click', 
            retailer: properties.retailer || (eventName === 'ebay_link_click' ? 'eBay' : 'Other'),
            ts: new Date().toISOString()
        });
    } else if (eventName.includes('checkout')) {
        dbService.logEvent({ type: 'source_redirect', ts: new Date().toISOString() });
    }
  };

  const startRotatingLoadingMessages = (initialMsg: string) => {
    setLoadingMessage(initialMsg);
    let index = 0;
    loadingIntervalRef.current = window.setInterval(() => { setLoadingMessage(LOADING_MESSAGES[index % LOADING_MESSAGES.length]); index++; }, 3000);
  };
  const stopRotatingLoadingMessages = () => { if (loadingIntervalRef.current) { clearInterval(loadingIntervalRef.current); loadingIntervalRef.current = null; } };

  const addXP = async (amount: number, label: string = "Maker Reward") => {
      if (!currentUser) return;
      const newXP = currentUser.makerXP + amount;
      
      let newRank: MakerRank = currentUser.makerRank;
      if (newXP >= 5000) newRank = 'Grand Architect';
      else if (newXP >= 3000) newRank = 'Master Maker';
      else if (newXP >= 1500) newRank = 'Senior Builder';
      else if (newXP >= 500) newRank = 'Studio Lead';

      const updatedUser: User = { ...currentUser, makerXP: newXP, makerRank: newRank };
      setCurrentUser(updatedUser); await dbService.upsertUser(updatedUser); 
      if (currentUser.gamificationEnabled) {
          setXpNotification({ amount, label }); 
          setTimeout(() => setXpNotification(null), 4000);
      }
  };

  useEffect(() => {
    const initData = async () => {
        try {
            // Check for reset password path
            if (window.location.pathname === '/reset-password') {
                setView('reset-password');
            }

            const cloudVideos = await dbService.getAllVideos();
            setVideos(cloudVideos || []); 
            
            // Restore session
            const lastUserEmail = localStorage.getItem('w1d1_last_user');
            const searchParams = new URLSearchParams(window.location.search);
            const status = searchParams.get('status');

            if (lastUserEmail) {
                const user = await dbService.getUser(lastUserEmail);
                if (user) {
                    setCurrentUser(user);
                    // If arrived from successful purchase, trigger a little celebration if they are now pro
                    if (status === 'success' && user.subscriptionStatus !== 'Free') {
                        // The server already awarded XP, but we can show a notification
                        setXpNotification({ amount: 0, label: `${user.subscriptionStatus} Level Synchronized!` });
                        setTimeout(() => setXpNotification(null), 5000);
                        // Clean up URL
                        window.history.replaceState({}, document.title, "/");
                    }
                }
            }
        } catch (e) {
            console.error("[App] Init Failed:", e);
        } finally {
            setInitialLoading(false);
        }
    };
    initData();
  }, []);

  useEffect(() => {
    (window as any).triggerSupport = () => setSupportModalOpen(true);
    return () => { delete (window as any).triggerSupport; };
  }, []);

  const handleVideoSelect = async (video: Video) => {
      const creator = await dbService.getUser(video.creatorId);
      const videoWithTip = { ...video, creatorTipQrUrl: creator?.tipQrUrl, creatorVenmoHandle: creator?.venmoHandle };
      setSelectedVideo(videoWithTip); setView('videoPlayer');
      await dbService.incrementVideoStat(video.id, 'views');
      trackEvent('video_view', { videoId: video.id });
  };

  const handleAnalysisLogic = async (type: UploadType, val: File[] | string, cat: ProjectCategory, userOverride?: User | null) => {
    if (isLoading) return;
    const effectiveUser = userOverride !== undefined ? userOverride : currentUser;
    
    if(!effectiveUser) { 
        setPendingAnalysis({ type, val, cat });
        setAuthModalMode('login'); 
        return; 
    }
    
    setPendingAnalysis(null); 
    setIsLoading(true); 
    startRotatingLoadingMessages("Vision Intel Active...");
    try { 
        // 1. Check for existing video by URL if applicable
        if (type === UploadType.YOUTUBE || type === UploadType.URL) {
            const urlStr = val as string;
            let normalizedUrl = urlStr;
            try {
                const urlObj = new URL(urlStr);
                if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
                    const v = urlObj.searchParams.get('v');
                    if (v) {
                        normalizedUrl = `https://www.youtube.com/watch?v=${v}`;
                    } else if (urlObj.hostname.includes('youtu.be')) {
                        const id = urlObj.pathname.slice(1);
                        normalizedUrl = `https://www.youtube.com/watch?v=${id}`;
                    }
                } else {
                    normalizedUrl = urlObj.origin + urlObj.pathname;
                }
            } catch (e) {
                normalizedUrl = urlStr.split('?')[0];
            }
            
            const existing = videos.find(v => v.videoUrl && (v.videoUrl === normalizedUrl || v.videoUrl.includes(normalizedUrl)));
            
            if (existing) {
                setSelectedVideo(existing);
                setAnalyzeModalOpen(false);
                setView('videoPlayer');
                setIsLoading(false);
                stopRotatingLoadingMessages();
                return;
            }
        }

        let p: Product[] = []; 
        if(type === UploadType.YOUTUBE || type === UploadType.URL) {
            p = await generateProductsFromUrl(val as string, cat); 
        } else { 
            const b64 = await Promise.all((val as File[]).map(f => blobToBase64(f))); 
            p = await generateProductsFromImages(b64, (val as File[])[0].type, cat); 
        } 
        const insights = await generateV3ProjectInsights("AI Scan Result", p, cat); 
        const newVideo: Video = { 
            id: Date.now(), 
            creator: "AI", 
            creatorId: "ai@watch1do1.com", 
            status: 'published', 
            sourceType: 'external',
            category: cat, 
            title: type === UploadType.YOUTUBE ? "AI Media Analysis" : "AI Vision Build", 
            videoUrl: type === UploadType.YOUTUBE || type === UploadType.URL ? val as string : '', 
            thumbnailUrl: p[0]?.imageUrl || 'https://picsum.photos/seed/ai/600/400', 
            products: p, 
            complementaryProducts: [], 
            insights, 
            activeBuilders: 0, 
            rating: 0, 
            ratingCount: 0 
        };

        // Cache the result in the database
        await dbService.insertVideo(newVideo);
        setVideos(prev => [newVideo, ...prev]);

        // Track in user profile
        if (effectiveUser) {
            const updatedUser = { ...effectiveUser, scannedVideoIds: [...(effectiveUser.scannedVideoIds || []), newVideo.id] };
            setCurrentUser(updatedUser);
            await dbService.upsertUser(updatedUser);
        }

        setSelectedVideo(newVideo); 
        setAnalyzeModalOpen(false); 
        setView('videoPlayer'); 
        addXP(50, "Vision Usage");
    } catch (e) { 
        console.error("Analysis failed:", e);
        alert("Analysis timed out or failed. Please try again or use a different URL."); 
    } finally { 
        setIsLoading(false); 
        stopRotatingLoadingMessages(); 
    }
  };

  const handleCreatorUpload = async (file: File, title: string, category: ProjectCategory, suggestedCategory?: string, description?: string, manualProducts: Product[] = []) => {
    if (!currentUser) return;
    setIsLoading(true); startRotatingLoadingMessages('Initializing Build Hub...');
    try {
        const thumbnailUrl = await generateVideoThumbnail(file);
        const aiProducts = await generateProductsFromText(title, category);
        const products = [...manualProducts, ...aiProducts];
        const insights = await generateV3ProjectInsights(title, products, category);
        const complementaryProducts = await generateComplementaryProducts(title, products, category);
        const newVideo: Video = {
            id: Date.now(), creator: currentUser.displayName, creatorId: currentUser.email.toLowerCase(),
            status: 'curating', category, suggestedCategory, title, videoUrl: URL.createObjectURL(file), thumbnailUrl,
            products, complementaryProducts, insights, activeBuilders: 1, rating: 0, ratingCount: 0,
            stats: { views: 0, clicks: 0, sales: 0, tips: 0, addToKitCount: 0 }
        };
        setVideos(prev => [newVideo, ...prev]); 
        await dbService.insertVideo(newVideo);
        setIsLoading(false); setUploadModalOpen(false); setSelectedVideo(newVideo); setView('videoPlayer');
    } catch (error: any) { alert("Logic extraction failed."); } finally { setIsLoading(false); stopRotatingLoadingMessages(); }
  };

  const handleAuthSubmit = async (email: string, password?: string, isOver18: boolean = false) => {
    setIsLoading(true); 
    try {
        const normalizedEmail = email.toLowerCase();
        const endpoint = authModalMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: normalizedEmail, password, isOver18 })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            setCurrentUser(data.user);
            localStorage.setItem('w1d1_last_user', normalizedEmail);
            setAuthModalMode(null);
            
            if (pendingAnalysis) {
                setAnalyzeModalInitialTab(pendingAnalysis.type);
                setAnalyzeModalOpen(true);
            } else if (data.user.isAdmin || data.user.isVerifiedPartner) {
                setView('admin');
            }
        } else {
            alert(data.error || "Authentication failed. Check your credentials.");
        }
    } catch (error) {
        console.error("Auth Error:", error);
        alert("Workshop portal is currently restricted. Check connection.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleAddToKit = (product: Product) => {
    setPlanningKit(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { ...product, quantity: 1 }];
    });
    trackEvent('add_to_kit', { productName: product.id });
  };

  const handleRateVideo = async (videoId: number, rating: number) => {
    if (!currentUser) return;
    setVideos(prev => prev.map(v => v.id === videoId ? { ...v, rating: ((v.rating || 0) * (v.ratingCount || 0) + rating) / ((v.ratingCount || 0) + 1), ratingCount: (v.ratingCount || 0) + 1 } : v));
    if (selectedVideo?.id === videoId) {
        setSelectedVideo(prev => prev ? { ...prev, rating: ((prev.rating || 0) * (prev.ratingCount || 0) + rating) / ((prev.ratingCount || 0) + 1), ratingCount: (prev.ratingCount || 0) + 1 } : null);
    }
    addXP(25, "Feedback Signal");
    await dbService.incrementVideoStat(videoId, 'ratingCount');
  };

  const handleSourceMaterials = async (kit: CartItem[]) => {
    if (!currentUser) { setAuthModalMode('login'); return; }
    
    if (kit.length > 0) {
        setIsLoading(true); 
        startRotatingLoadingMessages("Standardizing Affiliate Routing...");
        
        setTimeout(() => {
            const processedKit = kit.map(item => {
                const creatorIsSubscribed = selectedVideo?.creatorSubscriptionStatus && selectedVideo.creatorSubscriptionStatus !== 'Free';
                const platformCampId = '5339014523';
                const campId = creatorIsSubscribed ? (selectedVideo?.epnCampId || platformCampId) : platformCampId;
                
                let handoffUrl = (item.isCreatorDeclared && item.creatorAffiliateUrl && creatorIsSubscribed) 
                  ? item.creatorAffiliateUrl 
                  : item.purchaseUrl;
                
                if (handoffUrl.includes('ebay.com')) {
                    const urlObj = new URL(handoffUrl);
                    if (!creatorIsSubscribed) {
                        urlObj.searchParams.set('campid', platformCampId);
                        urlObj.searchParams.set('customid', 'w1d1_free_tier');
                    } else {
                        if (!urlObj.searchParams.has('campid')) {
                            urlObj.searchParams.set('campid', campId);
                        }
                        urlObj.searchParams.set('customid', 'w1d1_kit_source');
                    }
                    urlObj.searchParams.set('toolid', '10001');
                    handoffUrl = urlObj.toString();
                }
                return { ...item, purchaseUrl: handoffUrl };
            });
            
            setSourcingKit(processedKit);
            setIsLoading(false);
            stopRotatingLoadingMessages();
            trackEvent('source_redirect', { itemCount: kit.length, creatorSubscribed: !!selectedVideo?.creatorSubscriptionStatus });
        }, 1200);
    }
  };

  const handleSubscriptionProcess = async (tier: SubscriptionStatus, interval: string = "monthly") => {
      if (!currentUser) return;
      setIsLoading(true);
      startRotatingLoadingMessages(`Opening Stripe Billing Gateway for ${tier} Tier (${interval})...`);
      try {
          const { url } = await stripeService.createSubscriptionSession(currentUser.email, tier, interval);
          if (url) window.location.href = url;
      } catch (e) { alert("Billing gateway unreachable."); } finally { setIsLoading(false); stopRotatingLoadingMessages(); }
  };

  const handleTriggerShare = (video: Video, isCreator: boolean) => {
      setShareData({ video, isCreator });
      setShareModalOpen(true);
  };

  const renderContent = () => {
    if (view === 'about') return <AboutUs onBack={handleNavigateHome} />;
    if (view === 'terms') return <TermsOfService onBack={handleNavigateHome} />;
    if (view === 'privacy') return <PrivacyPolicy onBack={handleNavigateHome} />;
    if (view === 'disclosure') return <AffiliateDisclosure onBack={handleNavigateHome} />;
    if (view === 'affiliateGuide') return <AffiliateGuide onBack={handleNavigateHome} currentUser={currentUser} />;
    if (view === 'contact') return <ContactUs onBack={handleNavigateHome} trackEvent={trackEvent} />;
    if (view === 'reset-password') return <ResetPasswordPage onBack={() => { setView('home'); setAuthModalMode('login'); window.history.pushState({}, '', '/'); }} />;
    if (view === 'support') {
        handleNavigateHome(); // Reset to home but modal will be open
        return null;
    }
    if (view === 'admin' && currentUser) return <AdminDashboard videos={videos} currentUser={currentUser} onNavigate={setView} onApprove={(id, prod, comp, epn, ins, title, status) => { 
        dbService.updateVideoStatus(id, 'published', prod, comp, ins, title); 
        setVideos(prev => prev.map(v => {
            if (Number(v.id) === Number(id)) {
                const updated = { ...v, status: 'published' as VideoStatus, products: prod, complementaryProducts: comp, epnCampId: epn, insights: ins || v.insights, title: title || v.title, creatorSubscriptionStatus: (status as any) || v.creatorSubscriptionStatus };
                // Trigger Approval Email
                if (updated.creatorId && !updated.creatorId.includes('ai@')) {
                    emailService.sendApprovalEmail(updated.creatorId, updated.title, updated.products);
                }
                return updated;
            }
            return v;
        })); 
    }} onReject={(id, reason, note) => { 
        dbService.updateVideoStatus(id, 'rejected'); 
        const videoToNotify = videos.find(v => Number(v.id) === Number(id));
        if (videoToNotify && videoToNotify.creatorId && !videoToNotify.creatorId.includes('ai@')) {
            emailService.sendRejectionEmail(videoToNotify.creatorId, videoToNotify.title, reason || 'Content Standards', note || 'Please refine your materials list.');
        }
        setVideos(prev => prev.map(v => Number(v.id) === Number(id) ? ({ ...v, status: 'rejected' as VideoStatus }) : v)); 
    }} onDelete={(id) => { 
        setVideos(prev => prev.filter(v => Number(v.id) !== Number(id))); 
    }} onBack={handleNavigateHome} onUploadClick={() => setUploadModalOpen(true)} />;
    if (view === 'videoPlayer' && selectedVideo) return (
        <VideoPlayerView 
            video={selectedVideo} 
            onBack={handleNavigateHome} 
            onTip={() => setTipModalOpen(true)} 
            isSubscribed={currentUser?.subscriptionStatus === 'Plus' || currentUser?.subscriptionStatus === 'Pro' || currentUser?.subscriptionStatus === 'Studio'} 
            onToggleFavorite={(id) => { 
                if(!currentUser) { setAuthModalMode('login'); return; } 
                const isFav = currentUser.favoritedVideoIds.includes(id); 
                const newFavs = isFav ? currentUser.favoritedVideoIds.filter(f => f !== id) : [...currentUser.favoritedVideoIds, id]; 
                setCurrentUser({...currentUser, favoritedVideoIds: newFavs}); 
                dbService.upsertUser({...currentUser, favoritedVideoIds: newFavs}); 
            }} 
            isFavorited={currentUser?.favoritedVideoIds.includes(selectedVideo.id) || false} 
            currentUser={currentUser} 
            onAddProductClick={() => {}} 
            onRemoveProduct={(pid) => { 
                setSelectedVideo(prev => {
                    if (!prev) return null;
                    const upd = { ...prev, products: prev.products.filter(p => p.id !== pid) };
                    setVideos(prevVideos => prevVideos.map(v => v.id === prev.id ? upd : v));
                    return upd;
                });
            }} 
            onAddFoundProduct={(p) => { 
                setSelectedVideo(prev => {
                    if (!prev) return null;
                    const upd = { ...prev, products: [...prev.products, p] };
                    setVideos(prevVideos => prevVideos.map(v => v.id === prev.id ? upd : v));
                    return upd;
                });
            }} 
            onAddToKit={handleAddToKit} 
            onSubmitKit={async () => { 
                if(selectedVideo) { 
                    if (selectedVideo.creatorId === 'ai@watch1do1.com') {
                        // For AI videos, we save the refined products back to the DB
                        await dbService.updateVideoStatus(selectedVideo.id, 'published', selectedVideo.products, selectedVideo.complementaryProducts, selectedVideo.insights, selectedVideo.title);
                        setVideos(prev => prev.map(v => v.id === selectedVideo.id ? { ...v, products: selectedVideo.products, complementaryProducts: selectedVideo.complementaryProducts } : v));
                        addXP(100, "Protocol Refinement");
                    } else {
                        await dbService.updateVideoStatus(selectedVideo.id, 'pending_review'); 
                        setVideos(prev => prev.map(v => v.id === selectedVideo.id ? { ...v, status: 'pending_review' } : v)); 
                    }
                } 
            }} 
            onRateVideo={(vid, rating) => { 
                if(!currentUser) { setAuthModalMode('login'); return; } 
                handleRateVideo(vid, rating); 
            }} 
            onCompleteProject={(vid, title, img, note) => { 
                if(!currentUser) { setAuthModalMode('login'); return; }
                const completed = { videoId: vid, projectTitle: title, completionDate: new Date().toISOString(), resultImageUrl: img, note }; 
                const upd = { ...currentUser, completedProjects: [...currentUser.completedProjects, completed] }; 
                setCurrentUser(upd); 
                dbService.upsertUser(upd); 
                addXP(150, "Build Mastery"); 
            }} 
            onShare={() => handleTriggerShare(selectedVideo, selectedVideo.creatorId === currentUser?.email)} 
            planningKit={planningKit} 
            trackEvent={trackEvent} 
        />
    );
    if (view === 'profile' && currentUser) return <ProfilePage user={currentUser} currentUser={currentUser} userVideos={videos.filter(v => v.creatorId.toLowerCase() === currentUser.email.toLowerCase())} scannedVideos={videos.filter(v => currentUser.scannedVideoIds?.includes(v.id))} allVideos={videos} onAvatarChange={(file) => { const newAvatar = URL.createObjectURL(file); setCurrentUser({...currentUser, avatarUrl: newAvatar}); }} onVideoClick={handleVideoSelect} onProfileUpdate={async (info) => { const updated = {...currentUser, ...info}; setCurrentUser(updated); await dbService.upsertUser(updated); }} onManageSubscription={() => setManageSubscriptionModalOpen(true)} onBack={handleNavigateHome} onShare={handleTriggerShare} defaultTab={profileInitialTab} />;
    if (isInitialLoading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
            <div className="relative mb-6 flex items-center justify-center">
                <div className="w-24 h-24 border-2 border-[#7D8FED]/10 border-t-[#7D8FED] rounded-full animate-spin" />
                <img src={APP_CONFIG.LOGO_PATH} alt="" className="absolute w-10 h-10 object-contain animate-pulse" />
            </div>
            <p className="font-black uppercase text-[10px] tracking-widest">Entering Maker Studio...</p>
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-8 animate-fade-in min-h-[80vh]">
            <div className={`flex flex-col items-center justify-center transition-all duration-700 ${hasInteraction ? 'pt-8 mb-16' : 'h-[70vh]'}`}>
                <div className="w-full max-w-4xl text-center">
                    <div className="flex flex-col justify-center items-center gap-6 sm:gap-10 mb-12 sm:mb-20 transform animate-scale-in">
                        <div className="h-32 sm:h-52 md:h-64 w-full max-w-[450px] relative flex items-center justify-center transition-all duration-500 hover:scale-105 cursor-default drop-shadow-[0_20px_50px_rgba(125,143,237,0.2)]">
                           <img 
                             src={APP_CONFIG.LOGO_PATH} 
                             alt="Watch1Do1 Official Logo" 
                             className="h-full w-full object-contain relative z-10" 
                             onError={(e) => { 
                                 e.currentTarget.style.display = 'none'; 
                                 e.currentTarget.nextElementSibling?.classList.remove('hidden'); 
                             }} 
                           />
                           <div className="logo-fallback hidden absolute inset-0 flex items-center justify-center">
                               <SparkleIcon className="h-24 sm:h-40 md:h-48 w-24 sm:w-40 md:w-48 text-[#7D8FED] animate-pulse-subtle" />
                           </div>
                        </div>
                        <div className="text-center">
                            <h1 className="text-4xl sm:text-7xl md:text-8xl font-black text-white tracking-tighter mb-2 drop-shadow-2xl">Watch1Do1</h1>
                            <p className="text-[8px] sm:text-[10px] font-black text-[#7D8FED] uppercase tracking-[0.2em] sm:tracking-[0.5em] opacity-80">AI Vision Workshop Terminal</p>
                        </div>
                    </div>
                    
                    <form onSubmit={(e) => e.preventDefault()} className="relative group max-w-2xl mx-auto mb-6">
                        <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="What do you want to do today?" className="w-full py-6 pl-6 pr-16 sm:pl-10 sm:pr-24 text-sm sm:text-xl bg-slate-800 border-2 border-slate-700 rounded-[3.5rem] focus:ring-[15px] focus:ring-[#7D8FED]/5 focus:border-[#7D8FED] outline-none shadow-2xl transition-all" />
                        <button type="submit" className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 p-3 sm:p-4 bg-[#7D8FED] rounded-full hover:bg-[#6b7ae6] shadow-xl"><SearchIcon className="h-5 w-5 sm:h-7 sm:w-7 text-white"/></button>
                    </form>

                    <div className="relative max-w-sm mx-auto" ref={categoryDropdownRef}>
                        <button 
                            onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                            className="w-full flex items-center justify-between px-8 py-4 bg-slate-800/40 border border-slate-700 rounded-full hover:bg-slate-800 transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <CategoryIcon category={selectedCategory === 'All' ? 'Other' : selectedCategory} className="w-5 h-5 text-[#7D8FED]" />
                                <span className="text-[11px] font-black uppercase tracking-widest text-slate-300">
                                    {selectedCategory === 'All' ? 'Select Project Hub' : `${selectedCategory} Hub`}
                                </span>
                            </div>
                            <ChevronDownIcon className={`w-4 h-4 text-slate-500 transition-transform ${isCategoryMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isCategoryMenuOpen && (
                            <div className="absolute top-full mt-4 w-full bg-slate-800 border border-slate-700 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-[90] overflow-hidden animate-scale-in origin-top">
                                <div className="p-4 grid grid-cols-1 gap-1 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                    <button 
                                        onClick={() => { setSelectedCategory('All'); setIsCategoryMenuOpen(false); }}
                                        className={`w-full text-left px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === 'All' ? 'bg-[#7D8FED] text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                                    >
                                        All Project Hubs
                                    </button>
                                    {CATEGORIES.map(cat => (
                                        <button 
                                            key={cat}
                                            onClick={() => { setSelectedCategory(cat); setIsCategoryMenuOpen(false); }}
                                            className={`w-full text-left px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-4 ${selectedCategory === cat ? 'bg-[#7D8FED] text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                                        >
                                            <CategoryIcon category={cat} className="w-4 h-4 opacity-70" />
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {hasInteraction && (
                <div className="animate-fade-in pb-20">
                    <div className="flex items-center justify-between mb-12 pb-6 border-b border-slate-800">
                        <h2 className="text-4xl font-black text-white tracking-tighter">
                            {selectedCategory === 'All' ? (searchQuery ? `Results for "${searchQuery}"` : 'Global Hubs') : `${selectedCategory} Hub`}
                        </h2>
                        <div className="flex items-center gap-3">
                            <button onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }} className="text-[9px] font-black uppercase text-rose-500 hover:text-rose-400 transition-colors flex items-center gap-1 bg-rose-500/5 px-3 py-1.5 rounded-full border border-rose-500/20">
                                <CloseIcon className="w-3 h-3" /> Reset Filter
                            </button>
                        </div>
                    </div>
                    
                    {filteredVideos.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                            {filteredVideos.map(v => <VideoCard key={v.id} video={v} onSelect={handleVideoSelect} currentUser={currentUser} />)}
                        </div>
                    ) : (
                        <NoResultsAnalysis 
                            searchQuery={searchQuery || selectedCategory} 
                            onAnalyzeURL={() => setAnalyzeModalOpen(true)} 
                            onAnalyzeImage={() => setAnalyzeModalOpen(true)} 
                            onDirectAnalyze={(url) => handleAnalysisLogic(UploadType.YOUTUBE, url, selectedCategory === 'All' ? 'Other' : selectedCategory)}
                            isLoading={isLoading}
                        />
                    )}
                </div>
            )}
        </div>
    );
  };

  const handleFooterNavigate = (v: any) => {
    if (v === 'support') {
        setSupportModalOpen(true);
    } else {
        setView(v); 
        window.scrollTo({ top: 0, behavior: 'instant' }); 
    }
  };

  return (
    <div className={`flex flex-col min-h-screen bg-[#0f172a] ${isKitPanelOpen || isDebugPanelOpen || isSupportModalOpen ? 'overflow-hidden' : ''}`}>
        <Header 
            onUploadClick={() => currentUser ? setUploadModalOpen(true) : setAuthModalMode('login')} 
            onAnalyzeClick={() => setAnalyzeModalOpen(true)} 
            onLoginClick={() => {
                console.log("Sign In clicked");
                setAuthModalMode('login');
            }} 
            onSignupClick={() => setAuthModalMode('signup')} 
            onLogoutClick={handleLogout} 
            onProfileClick={(tab) => { 
                setProfileInitialTab(tab || 'overview'); 
                setView('profile'); 
                window.scrollTo({ top: 0, behavior: 'instant' });
            }} 
            currentUser={currentUser} 
            onHomeClick={handleNavigateHome} 
            onKitClick={() => setKitPanelOpen(true)} 
            kitItemCount={planningKit.length} 
            onAdminClick={() => { setView('admin'); window.scrollTo({ top: 0, behavior: 'instant' }); }} 
            onDebugClick={() => setDebugPanelOpen(true)} 
            onKeyClick={() => {}} 
            onUpgradeClick={() => setManageSubscriptionModalOpen(true)}
        />
        {authModalMode && <AuthModal mode={authModalMode} onClose={() => setAuthModalMode(null)} onSubmit={handleAuthSubmit} onSwitchMode={() => setAuthModalMode(prev => prev === 'login' ? 'signup' : 'login')} />}
        {isSupportModalOpen && <SupportModal onClose={() => setSupportModalOpen(false)} stripeUrl={STRIPE_SUPPORT_LINK} />}
        <main className="flex-grow pt-20">{renderContent()}</main>
        <Footer onNavigate={handleFooterNavigate} />

        {/* Mobile Floating Action Buttons */}
        <div className="sm:hidden fixed bottom-24 right-6 z-[150] flex flex-col gap-4">
            <button 
                onClick={() => setAnalyzeModalOpen(true)}
                title="AI Vision"
                className="w-14 h-14 bg-slate-800 border border-[#7D8FED]/30 text-[#7D8FED] rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
            >
                <CameraIcon className="w-6 h-6" />
            </button>
            <button 
                onClick={() => currentUser ? setUploadModalOpen(true) : setAuthModalMode('login')}
                title="Teach One"
                className="w-16 h-16 bg-[#7D8FED] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all animate-pulse-subtle"
            >
                <SparkleIcon className="w-8 h-8" />
            </button>
        </div>

        {isUploadModalOpen && <UploadModal currentUser={currentUser} onClose={() => setUploadModalOpen(false)} onUpload={handleCreatorUpload} isLoading={isLoading} loadingMessage={loadingMessage} onNavigate={setView} />}
        {isAnalyzeModalOpen && (
            <AnalyzeModal 
                currentUser={currentUser} 
                onClose={() => { setAnalyzeModalOpen(false); setPendingAnalysis(null); }} 
                onAnalyze={handleAnalysisLogic} 
                onAuthPrompt={(mode) => setAuthModalMode(mode)} 
                isLoading={isLoading} 
                loadingMessage={loadingMessage} 
                initialTab={analyzeModalInitialTab} 
                initialUrl={pendingAnalysis?.type === UploadType.YOUTUBE || pendingAnalysis?.type === UploadType.URL ? pendingAnalysis.val as string : ''}
                initialCategory={pendingAnalysis?.cat}
                onNavigate={setView}
            />
        )}
        {isTipModalOpen && selectedVideo && <DirectTipModal creatorName={selectedVideo.creator} qrUrl={selectedVideo.creatorTipQrUrl} venmoHandle={selectedVideo.creatorVenmoHandle} currentUser={currentUser} onClose={() => setTipModalOpen(false)} onSignalTip={(amt) => { dbService.upsertUser({...currentUser!, totalTipsReported: (currentUser?.totalTipsReported || 0) + amt}); if(currentUser) addXP(50 + (amt * 2), "Maker Support"); }} onShare={() => handleTriggerShare(selectedVideo, false)} onSignupClick={() => setAuthModalMode('signup')} />}
        <PlanningKitPanel isOpen={isKitPanelOpen} onClose={() => setKitPanelOpen(false)} kitItems={planningKit} onUpdateQuantity={(id, qty) => setPlanningKit(prev => prev.map(i => i.id === id ? {...i, quantity: Math.max(1, qty)} : i))} onRemoveItem={(id) => setPlanningKit(prev => prev.filter(i => i.id !== id))} onSourceMaterials={handleSourceMaterials} onEmailKit={() => setIsEmailModalOpen(true)} selectedVideo={selectedVideo} />
        <DebugTrackingPanel isOpen={isDebugPanelOpen} onClose={() => setDebugPanelOpen(false)} />
        {isManageSubscriptionModalOpen && currentUser && (
          <ManageSubscriptionModal 
            onClose={() => setManageSubscriptionModalOpen(false)} 
            currentStatus={currentUser.subscriptionStatus} 
            onSubscriptionChange={(ns, interval) => { 
              if (ns !== 'Free') {
                handleSubscriptionProcess(ns, interval);
              } else {
                const updated = { ...currentUser, subscriptionStatus: 'Free' as SubscriptionStatus };
                setCurrentUser(updated);
                dbService.updateSubscription(currentUser.email, 'Free');
                setManageSubscriptionModalOpen(false);
              }
            }} 
          />
        )}
        {isShareModalOpen && shareData && <ShareModal video={shareData.video} isCreatorView={shareData.isCreator} onClose={() => setShareModalOpen(false)} />}
        
        {sourcingKit.length > 0 && <SourcingRedirectModal items={sourcingKit} onClose={() => setSourcingKit([])} />}
        {isEmailModalOpen && <EmailKitModal items={planningKit} projectTitle={selectedVideo?.title || "Watch1Do1 Project"} onClose={() => setIsEmailModalOpen(false)} onSend={async (email) => { await emailService.sendEmailKit(email, selectedVideo?.title || "Kit", planningKit); }} />}

        {xpNotification && (
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] bg-slate-800 border border-[#7D8FED]/40 px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-6 animate-scale-in">
                <div className="w-12 h-12 bg-[#7D8FED]/20 rounded-xl flex items-center justify-center border border-[#7D8FED]/30"><SparkleIcon className="w-6 h-6 text-[#7D8FED]" /></div>
                <div><p className="text-[10px] font-black text-[#7D8FED] uppercase tracking-widest">{xpNotification.label}</p><p className="text-xl font-black text-white">+{xpNotification.amount} XP SECURED</p></div>
            </div>
        )}

        {isLoading && (
            <div className="fixed inset-0 z-[500] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center no-print">
                <div className="relative mb-8">
                    {/* Spinning outer circle */}
                    <div className="w-24 h-24 border-4 border-[#7D8FED]/20 border-t-[#7D8FED] rounded-full animate-spin" />
                    
                    {/* Logo in the center with pulse effect */}
                    <img 
                      src={APP_CONFIG.LOGO_PATH} 
                      alt="Logo" 
                      className="absolute inset-0 m-auto w-10 h-10 object-contain animate-pulse" 
                      referrerPolicy="no-referrer" 
                    />
                </div>
                <div className="mt-8 text-center">
                    <p className="text-white font-black uppercase tracking-[0.3em] text-sm mb-2">{loadingMessage || "Vision Intel Active..."}</p>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest animate-pulse">Extracting Visual Logic Patterns</p>
                </div>
            </div>
        )}
    </div>
  );
};
export default App;
