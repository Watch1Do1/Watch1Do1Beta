
import React, { useState, useEffect, useRef } from 'react';
import { Video, Product, User, CartItem, Money } from '../types';
import { dbService } from '../services/dbService';
import ProductCard from './ProductCard';
import ChatInterface from './ChatInterface';
import ProjectInsights from './ProjectInsights';
import { searchSpecificProduct, revalidateProductAvailability, generateDeepDiveProducts } from '../services/geminiService';
import { SparkleIcon, ArrowLeftIcon, HeartIcon, ShoppingCartIcon, MessageCircleIcon, BarChartIcon, SearchIcon, PlusIcon, RefreshCwIcon, CheckCircleIcon, MedalIcon, TrophyIcon, CameraIcon, PhotoIcon, DollarSignIcon, UserIcon, ShieldIcon, EyeIcon, XCircleIcon, ShareIcon, TrashIcon, SendIcon } from './IconComponents';

interface VideoPlayerViewProps {
  video: Video;
  onBack: () => void;
  onTip: () => void;
  onShare: () => void;
  isSubscribed: boolean;
  onToggleFavorite: (videoId: number) => void;
  isFavorited: boolean;
  currentUser: User | null;
  onAddProductClick: () => void;
  onRemoveProduct: (productId: string) => void;
  onAddFoundProduct: (product: Product) => void;
  onAddToKit: (product: Product) => void;
  onSubmitKit: () => Promise<void>;
  onRateVideo: (videoId: number, rating: number) => void;
  onCompleteProject: (videoId: number, title: string, imageUrl: string, note: string) => void;
  planningKit: CartItem[];
  trackEvent: (eventName: string, props: any) => void;
}

const formatPrice = (m: Money) => `$${m.amount.toFixed(2)}`;

const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({ 
    video, onBack, onTip, onShare, isSubscribed, onToggleFavorite, isFavorited, currentUser,
    onRemoveProduct, onAddFoundProduct, onAddToKit, onSubmitKit, onRateVideo, onCompleteProject,
    planningKit, trackEvent
}) => {
  const isCreator = currentUser?.email === video.creatorId;
  const isPartnerOwner = currentUser?.isVerifiedPartner && (isCreator || video.products.some(p => p.merchantId === currentUser.partnerId));
  const canManage = isCreator || isPartnerOwner || currentUser?.isAdmin;
  
  const isAiVideo = video.creatorId === 'ai@watch1do1.com';
  const isCurating = video.status === 'curating';
  const isPublished = video.status === 'published';
  const gamificationEnabled = currentUser?.gamificationEnabled ?? true;
  
  const [localVideo, setLocalVideo] = useState<Video>(video);
  const [isEditing, setIsEditing] = useState((canManage && isCurating) || (isAiVideo && currentUser !== null));
  const [activeTab, setActiveTab] = useState<'shop' | 'chat' | 'insights' | 'community'>('shop');
  const [userRating, setUserRating] = useState<number | null>(null);
  const [isRatingHovered, setIsRatingHovered] = useState<number | null>(null);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionImage, setCompletionImage] = useState<string | null>(null);
  const [completionNote, setCompletionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isKittingAll, setIsKittingAll] = useState(false);
  
  const [creatorSearchQuery, setCreatorSearchQuery] = useState('');
  const [isSearchingMarket, setIsSearchingMarket] = useState(false);
  const [isDeepDiving, setIsDeepDiving] = useState(false);
  const [foundProducts, setFoundProducts] = useState<Product[]>([]);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'done' | 'error'>('idle');
  const [revalidatingIds, setRevalidatingIds] = useState<string[]>([]);
  
  // Reporting State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCategory, setReportCategory] = useState<any>('missing_tool');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalVideo(video);
    if (isCreator && isCurating) {
        setIsEditing(true);
    }
    if (isPublished && !isCreator && video.products.length > 0) {
        runAvailabilitySweep(video.products.slice(0, 2));
    }
  }, [video, isCreator, isCurating, isPublished]);

  const runAvailabilitySweep = async (items: Product[]) => {
    for (const item of items) {
        setRevalidatingIds(prev => [...prev, item.id]);
        try {
          const updates = await revalidateProductAvailability(item);
          if (updates.price && typeof updates.price !== 'string' && updates.price.amount !== item.price.amount) {
             setLocalVideo(prev => ({
                ...prev,
                products: prev.products.map(p => 
                    p.id === item.id ? { ...p, price: updates.price as Money, lastCheckedPrice: item.price, stockStatus: updates.stockStatus as any, available: updates.available } : p
                ),
                complementaryProducts: (prev.complementaryProducts || []).map(p => 
                    p.id === item.id ? { ...p, price: updates.price as Money, lastCheckedPrice: item.price, stockStatus: updates.stockStatus as any, available: updates.available } : p
                ),
             }));
          }
          await new Promise(r => setTimeout(r, 600));
        } catch (e) { console.error("Availability check failed", e); }
        setRevalidatingIds(prev => prev.filter(id => id !== item.id));
    }
  };

  const handleTabSwitch = (tab: 'shop' | 'chat' | 'insights' | 'community') => {
    setActiveTab(tab);
    trackEvent('tab_switch', { videoId: localVideo.id, tab });
  };

  const handleKitAll = async () => {
      setIsKittingAll(true);
      const allItems = [...localVideo.products, ...(localVideo.complementaryProducts || [])];
      for (const p of allItems) {
          onAddToKit(p);
      }
      setTimeout(() => {
          setIsKittingAll(false);
          trackEvent('kit_all_command', { videoId: localVideo.id, itemCount: allItems.length });
      }, 600);
  };

  const handleRate = (rating: number) => {
      if (userRating !== null) return;
      setUserRating(rating);
      onRateVideo(localVideo.id, rating);
  };

  const handleMarketSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = creatorSearchQuery.trim();
    if (!query) return;
    setIsSearchingMarket(true);
    setSearchStatus('searching');
    try {
        const results = await searchSpecificProduct(query);
        if (results && results.length > 0) {
            setFoundProducts(results);
            setSearchStatus('done');
        } else {
            setSearchStatus('idle');
            alert(`No exact matches found for "${query}".`);
        }
    } catch (err) { setSearchStatus('error'); } finally { setIsSearchingMarket(false); }
  };

  const handleSelectProduct = (product: Product) => {
      onAddFoundProduct(product);
      setFoundProducts(prev => prev.filter(p => p.id !== product.id));
  };

  const handleDeepDive = async () => {
    if (isDeepDiving) return;
    setIsDeepDiving(true);
    trackEvent('deep_dive_start', { videoId: localVideo.id });
    try {
        const proItems = await generateDeepDiveProducts(localVideo.title, localVideo.products, localVideo.category);
        if (proItems && proItems.length > 0) {
            // Add all products to the hub
            proItems.forEach(p => onAddFoundProduct(p));
            trackEvent('deep_dive_success', { videoId: localVideo.id, itemCount: proItems.length });
        } else {
            alert("Digital search complete. No additional specialized items identified for this specific stage.");
        }
    } catch (e) {
        console.error("Deep Dive failed", e);
    } finally {
        setIsDeepDiving(false);
    }
  };

  const handleFinalSubmit = async () => {
      setIsSubmitting(true);
      try {
          await onSubmitKit();
          setIsEditing(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setShowSuccessOverlay(true);
      } catch (err) { alert("Submission failed."); } finally { setIsSubmitting(false); }
  };

  const submitCompletion = () => {
      if (!completionImage) return;
      onCompleteProject(localVideo.id, localVideo.title, completionImage, completionNote);
      setShowCompletionModal(false);
      setCompletionImage(null);
      setCompletionNote('');
      setTimeout(onShare, 500); // Suggest share after project completion
  };

  const submitReport = async () => {
    if (!currentUser) return;
    setIsSubmittingReport(true);
    try {
        await dbService.submitReport({
            videoId: localVideo.id,
            projectTitle: localVideo.title,
            reporterEmail: currentUser.email,
            category: reportCategory,
            description: reportDescription
        });
        setReportSubmitted(true);
        setTimeout(() => {
            setShowReportModal(false);
            setReportSubmitted(false);
            setReportDescription('');
        }, 2000);
    } catch (e) {
        alert("Report submission failed.");
    } finally {
        setIsSubmittingReport(false);
    }
  };

  const buildersCount = localVideo.activeBuilders || 0;
  const hasBuiltThis = currentUser?.completedProjects.some(p => p.videoId === localVideo.id);

  const [isManageMenuOpen, setIsManageMenuOpen] = useState(false);

  const handleDeleteHub = async () => {
    if (window.confirm("CRITICAL: This will permanently remove this project hub from the platform. Proceed?")) {
        await dbService.deleteVideo(localVideo.id);
        onBack();
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in relative">
      <div className="flex justify-between items-center mb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all group">
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Hub Library
        </button>

        {canManage && (
            <div className="relative">
                <button 
                    onClick={() => setIsManageMenuOpen(!isManageMenuOpen)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                >
                    <ShieldIcon className="w-3.5 h-3.5" />
                    Manage Hub
                </button>

                {isManageMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-scale-in origin-top-right">
                        <div className="p-2 space-y-1">
                            <button 
                                onClick={handleDeleteHub}
                                className="w-full flex items-center gap-3 px-4 py-3 text-[9px] font-black uppercase text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                            >
                                <TrashIcon className="w-4 h-4" />
                                Remove from Platform
                            </button>
                            <button 
                                onClick={() => { setIsManageMenuOpen(false); setShowReportModal(true); }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-[9px] font-black uppercase text-amber-500 hover:bg-amber-500/10 rounded-xl transition-all"
                            >
                                <ShieldIcon className="w-4 h-4" />
                                Report Quality Issue
                            </button>
                            <a 
                                href={`mailto:team@watch1do1.com?subject=Link Change Request: ${localVideo.title}&body=Video ID: ${localVideo.id}%0D%0APlease update links for the following items:`}
                                className="w-full flex items-center gap-3 px-4 py-3 text-[9px] font-black uppercase text-slate-400 hover:bg-slate-800 rounded-xl transition-all"
                            >
                                <SendIcon className="w-4 h-4" />
                                Request Link Change
                            </a>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>

      {showCompletionModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setShowCompletionModal(false)}></div>
              <div className="bg-slate-800 border border-slate-700 rounded-[3rem] p-10 max-xl w-full shadow-2xl relative animate-scale-in">
                  <h2 className="text-3xl font-black text-white mb-2 tracking-tighter">{gamificationEnabled ? "Mastery Showcase" : "Project Archive"}</h2>
                  <p className="text-slate-400 text-sm mb-8">{gamificationEnabled ? "Upload a photo of your finished project to earn +150 XP." : "Upload a photo for your project archive."}</p>
                  <div onClick={() => fileInputRef.current?.click()} className="aspect-square bg-slate-900 border-2 border-dashed border-slate-700 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:border-[#7D8FED] transition-all overflow-hidden mb-6 relative">
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => setCompletionImage(ev.target?.result as string);
                              reader.readAsDataURL(file);
                          }
                      }} />
                      {completionImage ? <img src={completionImage} className="w-full h-full object-cover" alt="" /> : <CameraIcon className="w-12 h-12 text-slate-700" />}
                  </div>
                  <textarea value={completionNote} onChange={(e) => setCompletionNote(e.target.value)} placeholder="Any tips for future builders?" className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white text-sm mb-8 outline-none focus:border-[#7D8FED]" rows={3} />
                  <div className="flex gap-4">
                      <button onClick={() => setShowCompletionModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-500 hover:text-white">Cancel</button>
                      <button onClick={submitCompletion} disabled={!completionImage} className="flex-[2] py-4 bg-[#7D8FED] text-white font-black rounded-2xl uppercase tracking-widest text-[10px]">Post Result</button>
                  </div>
              </div>
          </div>
      )}

      {showSuccessOverlay && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"></div>
              <div className="bg-slate-800 border border-slate-700 rounded-[3rem] p-12 max-w-lg w-full shadow-2xl relative animate-scale-in text-center">
                  <div className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 border-2 shadow-2xl ${isAiVideo ? 'bg-[#7D8FED]/10 border-[#7D8FED]/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                      {isAiVideo ? <SparkleIcon className="w-16 h-16 text-[#7D8FED]" /> : <TrophyIcon className="w-16 h-16 text-emerald-500" />}
                  </div>
                  <h2 className="text-4xl font-black text-white mb-4 tracking-tighter">
                      {isAiVideo ? 'Protocol Refined!' : 'Build Hub Deployed!'}
                  </h2>
                  <p className="text-slate-400 mb-10 leading-relaxed font-medium">
                      {isAiVideo 
                        ? "Thank you for perfecting this kit. Your refinements make it faster and more accurate for every maker who scans this video in the future." 
                        : "Your expertise is now part of the global project library."}
                  </p>
                  <div className="flex flex-col gap-4">
                      {isAiVideo ? (
                          <>
                              <button 
                                onClick={() => { setShowSuccessOverlay(false); setActiveTab('shop'); }} 
                                className="w-full py-5 bg-[#7D8FED] text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs hover:bg-[#6b7ae6] transition-all flex items-center justify-center gap-3"
                              >
                                  <ShoppingCartIcon className="w-4 h-4" />
                                  Continue to Planning Kit
                              </button>
                              <button onClick={onBack} className="w-full py-5 bg-slate-700 text-white font-black rounded-2xl hover:bg-slate-600 transition-all uppercase tracking-[0.2em] text-xs">Return to Studio</button>
                          </>
                      ) : (
                          <>
                              <button onClick={onShare} className="w-full py-5 bg-[#7D8FED] text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs hover:bg-[#6b7ae6] transition-all">Promote Hub to Social</button>
                              <button onClick={onBack} className="w-full py-5 bg-slate-700 text-white font-black rounded-2xl hover:bg-slate-600 transition-all uppercase tracking-[0.2em] text-xs">Return to Studio</button>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}

      {showReportModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => !isSubmittingReport && setShowReportModal(false)}></div>
              <div className="bg-slate-800 border border-slate-700 rounded-[3rem] p-10 max-w-lg w-full shadow-2xl relative animate-scale-in">
                  {reportSubmitted ? (
                      <div className="text-center py-10">
                          <CheckCircleIcon className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
                          <h3 className="text-2xl font-black text-white tracking-tighter mb-2">Report Dispatched</h3>
                          <p className="text-slate-400 text-sm">Our team will review this project hub immediately.</p>
                      </div>
                  ) : (
                      <>
                        <div className="flex items-center gap-3 mb-6">
                            <ShieldIcon className="w-6 h-6 text-amber-500" />
                            <h2 className="text-3xl font-black text-white tracking-tighter">Report Issue</h2>
                        </div>
                        <p className="text-slate-400 text-sm mb-8 leading-relaxed">Is there a problem with this build kit? Signal our team so we can maintain workshop quality.</p>
                        
                        <div className="space-y-6 mb-10">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Report Category</label>
                                <select 
                                    value={reportCategory} 
                                    onChange={(e) => setReportCategory(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white text-sm outline-none focus:border-[#7D8FED]"
                                >
                                    <option value="missing_tool">Missing Tool/Material</option>
                                    <option value="incorrect_step">Incorrect Step/Instruction</option>
                                    <option value="safety_concern">Safety Concern</option>
                                    <option value="out_of_stock">Product Unavailable</option>
                                    <option value="other">Other Issue</option>
                                </select>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Description</label>
                                <textarea 
                                    value={reportDescription} 
                                    onChange={(e) => setReportDescription(e.target.value)}
                                    placeholder="Please provide details about the issue..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white text-sm outline-none focus:border-[#7D8FED]"
                                    rows={4}
                                />
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => setShowReportModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">Dismiss</button>
                            <button 
                                onClick={submitReport} 
                                disabled={isSubmittingReport || !reportDescription.trim()}
                                className="flex-[2] py-4 bg-amber-500 text-slate-900 font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-xl hover:bg-amber-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSubmittingReport ? <RefreshCwIcon className="w-4 h-4 animate-spin" /> : <SendIcon className="w-4 h-4" />}
                                {isSubmittingReport ? 'Dispatching...' : 'Submit Report'}
                            </button>
                        </div>
                      </>
                  )}
              </div>
          </div>
      )}

      <div className="flex flex-col lg:flex-row gap-10">
        <div className="flex-grow lg:w-2/3">
          <div className="aspect-video bg-black rounded-[2.5rem] overflow-hidden shadow-2xl mb-8 relative border border-slate-700/50 group">
            {localVideo.videoUrl ? <video src={localVideo.videoUrl} controls autoPlay muted playsInline className="w-full h-full object-contain" /> : <img src={localVideo.sourceImageUrl || localVideo.thumbnailUrl} alt="source" className="absolute inset-0 w-full h-full object-cover opacity-80" />}
            {isCreator && isCurating && <div className="absolute top-6 left-6 bg-amber-500 text-slate-900 px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl animate-pulse">Curating Mode Active</div>}
            
            {activeTab !== 'shop' && (
                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={() => setActiveTab('shop')}
                        className="px-6 py-3 bg-[#7D8FED] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-2xl hover:bg-[#6b7ae6] transition-all flex items-center gap-2"
                    >
                        <ShoppingCartIcon className="w-4 h-4" />
                        View Build Kit
                    </button>
                </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="flex-grow">
                <div className="flex items-center gap-5 mb-2">
                    <h1 className="text-4xl font-black text-white tracking-tighter">{localVideo.title}</h1>
                    <div className="flex gap-2">
                        <button onClick={() => onToggleFavorite(localVideo.id)} className={`p-4 rounded-2xl border transition-all ${isFavorited ? 'bg-rose-500 border-rose-400 text-white shadow-rose-500/20 shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-white'}`}><HeartIcon className="w-6 h-6" isFilled={isFavorited} /></button>
                        <button onClick={onShare} className="p-4 bg-slate-800 border border-slate-700 rounded-2xl text-slate-500 hover:text-white transition-all"><ShareIcon className="w-6 h-6" /></button>
                    </div>
                </div>
                <div className="flex items-center gap-6 mt-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center overflow-hidden">{localVideo.creatorId === 'ai@watch1do1.com' ? <SparkleIcon className="w-4 h-4 text-[#7D8FED]" /> : <UserIcon className="w-4 h-4 text-slate-500" />}</div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">curated by <span className="text-[#7D8FED]">{localVideo.creatorId === 'ai@watch1do1.com' ? 'Watch1Do1 AI' : (localVideo.creatorDisplayName || localVideo.creator || 'Maker')}</span></p>
                        {localVideo.creatorSubscriptionStatus && localVideo.creatorSubscriptionStatus !== 'Free' && (
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[7px] font-black text-amber-500 uppercase tracking-widest">
                                <MedalIcon className="w-2.5 h-2.5" /> Supported Creator
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-900/50 px-4 py-1.5 rounded-full border border-slate-700">
                        {gamificationEnabled ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div> : <EyeIcon className="w-3 h-3 text-slate-500" />}
                        {gamificationEnabled ? `${buildersCount} Building Now` : `${buildersCount} Views`}
                    </div>
                </div>
                <p className="mt-4 text-[8px] font-bold text-slate-600 uppercase tracking-widest leading-relaxed max-w-lg">
                    Planning kits are reviewed by the creator. AI is used to assist suggestions, not determine correctness.
                </p>
            </div>
            <div className="flex flex-col items-end gap-4 w-full md:w-auto">
                <div className="flex gap-4 w-full md:w-auto">
                    {isPublished && !isCreator && !hasBuiltThis && <button onClick={() => setShowCompletionModal(true)} className="flex-1 md:flex-none px-8 py-4 font-black text-white rounded-2xl bg-emerald-600 hover:bg-emerald-500 transition-all text-[10px] uppercase tracking-[0.2em]">{gamificationEnabled ? 'Mark as Built' : 'Record Build'}</button>}
                    {isPublished && !isCreator && localVideo.creatorSubscriptionStatus && localVideo.creatorSubscriptionStatus !== 'Free' && (
                        <button onClick={onTip} className="group flex flex-col items-center justify-center min-w-[160px] px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-2xl transition-all active:scale-95 border-b-4 border-amber-600">
                            <div className="flex items-center gap-2 mb-0.5"><DollarSignIcon className="w-5 h-5" /><span className="font-black text-[11px] uppercase tracking-[0.2em]">{currentUser ? 'Tip Master' : 'Support'}</span></div>
                            <span className="text-[7px] font-black uppercase tracking-widest opacity-60">100% Direct P2P Transfer</span>
                        </button>
                    )}
                </div>
                <div className="bg-slate-800/80 px-6 py-3 rounded-2xl border border-slate-700/50 flex items-center gap-5">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Mastery Level</span>
                    <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => {
                            const isFilled = (isRatingHovered !== null ? star <= isRatingHovered : star <= (userRating || localVideo.rating || 0));
                            return <button key={star} onMouseEnter={() => userRating === null && setIsRatingHovered(star)} onMouseLeave={() => userRating === null && setIsRatingHovered(null)} onClick={() => handleRate(star)} className="transition-all active:scale-90">{gamificationEnabled ? <SparkleIcon className={`w-5 h-5 ${isFilled ? 'text-amber-400' : 'text-slate-700'}`} /> : <div className={`w-5 h-5 rounded-full border-2 ${isFilled ? 'bg-amber-500 border-amber-500' : 'border-slate-700'}`}></div>}</button>;
                        })}
                    </div>
                </div>
            </div>
          </div>
        </div>
        
        <div className="lg:w-1/3 flex-shrink-0 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]">
          <div className="bg-slate-800 border border-slate-700 rounded-[2.5rem] flex flex-col h-full shadow-2xl overflow-hidden">
            <nav className="flex bg-slate-900 p-1.5">
                {['shop', 'insights', (isCreator ? 'community' : 'chat')].map(t => (
                    <button key={t} onClick={() => handleTabSwitch(t as any)} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${activeTab === t ? 'bg-[#7D8FED] text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>{t === 'shop' ? 'Kit' : t === 'insights' ? 'Analyze' : (isCreator ? 'Social' : 'Asst')}</button>
                ))}
            </nav>

            <div className="flex-grow flex flex-col min-h-0 overflow-y-auto custom-scrollbar p-6">
              {activeTab === 'shop' && (
                  <div className="space-y-8 animate-fade-in">
                      <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                              <h2 className="text-xl font-black text-white uppercase tracking-widest text-xs">Build Kit</h2>
                              {isAiVideo && (
                                  <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mt-1 animate-pulse">AI-Generated Protocol • Refine if Incorrect</p>
                              )}
                          </div>
                          <div className="flex gap-2">
                             {isPublished && (
                                <button 
                                    onClick={handleKitAll} 
                                    disabled={isKittingAll}
                                    className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all flex items-center gap-2 ${isKittingAll ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white border border-slate-600'}`}
                                >
                                    {isKittingAll ? <CheckCircleIcon className="w-3.5 h-3.5" /> : <PlusIcon className="w-3.5 h-3.5" />}
                                    {isKittingAll ? 'Syncing...' : 'Add Full Kit'}
                                </button>
                             )}
                             {(canManage || isAiVideo) && (
                                 <div className="flex gap-2">
                                     <button 
                                         onClick={handleDeepDive} 
                                         disabled={isDeepDiving}
                                         className="px-4 py-2 bg-slate-800 border border-[#7D8FED]/30 text-[#7D8FED] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#7D8FED]/10 transition-all flex items-center gap-2"
                                     >
                                         {isDeepDiving ? <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" /> : <SparkleIcon className="w-3.5 h-3.5" />}
                                         {isDeepDiving ? 'Searching...' : 'Deep Dive'}
                                     </button>
                                     <button onClick={() => setIsEditing(!isEditing)} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${isEditing ? 'bg-[#7D8FED] text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}>{isEditing ? 'Confirm' : 'Edit'}</button>
                                 </div>
                             )}
                          </div>
                      </div>

                      {(canManage || isAiVideo) && isEditing && (
                          <div className="space-y-4 p-6 bg-slate-900/50 rounded-3xl border border-slate-700">
                              <form onSubmit={handleMarketSearch} className="relative">
                                  <input type="text" placeholder="Incorporate specific materials..." value={creatorSearchQuery} onChange={(e) => setCreatorSearchQuery(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 pl-12 pr-12 text-xs text-white focus:outline-none focus:ring-4 focus:ring-[#7D8FED]/10 transition-all" />
                                  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                  <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-[#7D8FED] rounded-xl text-white shadow-lg">{isSearchingMarket ? <RefreshCwIcon className="w-4 h-4 animate-spin" /> : <PlusIcon className="w-4 h-4" />}</button>
                              </form>
                              {foundProducts.length > 0 && <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">{foundProducts.map(p => <div key={p.id} className="bg-slate-900 border-2 border-slate-700 rounded-2xl p-4 flex items-center justify-between group"><div className="flex items-center gap-4 min-w-0"><img src={p.imageUrl} className="w-12 h-12 rounded-lg object-cover" alt="" /><div className="min-w-0"><p className="text-xs font-black text-white truncate">{p.name}</p><p className="text-[10px] font-black text-[#7D8FED]">{formatPrice(p.price)}</p></div></div><button onClick={() => handleSelectProduct(p)} className="px-4 py-2 bg-emerald-600 rounded-xl text-white text-[9px] font-black uppercase">Select</button></div>)}</div>}
                          </div>
                      )}
                      
                      <div className="space-y-4">
                          {localVideo.products.length === 0 && (localVideo.complementaryProducts || []).length === 0 ? (
                              <div className="p-8 border-2 border-dashed border-slate-800 rounded-3xl text-center space-y-4 bg-slate-900/30">
                                  <ShoppingCartIcon className="w-12 h-12 text-slate-700 mx-auto opacity-50" />
                                  <div>
                                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                                          {isCurating ? "Build Kit Initialized (Empty)" : "No items identified for this hub."}
                                      </p>
                                      {isCurating && (
                                          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-tight mt-1">
                                              Use the curator search above to stock your hub with specific tools and gear.
                                          </p>
                                      )}
                                  </div>
                              </div>
                          ) : (
                              [...localVideo.products, ...(localVideo.complementaryProducts || [])].map((p) => (
                                  <ProductCard key={p.id} product={p} viewMode={(isCreator || isAiVideo) && isEditing ? 'curator' : 'shopper'} isEditing={(isCreator || isAiVideo) && isEditing} isRevalidating={revalidatingIds.includes(p.id)} onRemove={onRemoveProduct} onAddToKit={onAddToKit} planningKit={planningKit} videoId={localVideo.id} trackEvent={trackEvent} currentUser={currentUser} />
                              ))
                          )}
                          
                          {isPublished && !isEditing && (
                              <button 
                                onClick={handleKitAll}
                                className="w-full py-4 mt-4 bg-emerald-600/10 border border-emerald-500/30 text-emerald-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-3"
                              >
                                  <PlusIcon className="w-4 h-4" />
                                  Add Complete Build Kit
                              </button>
                          )}
                      </div>

                      {(isCreator || isAiVideo) && (isCurating || isEditing) && (
                          <div className="mt-8 pt-8 border-t border-slate-700">
                              <button 
                                onClick={handleFinalSubmit} 
                                disabled={isSubmitting} 
                                className={`w-full py-5 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-3 ${isAiVideo ? 'bg-[#7D8FED] hover:bg-[#6b7ae6]' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                              >
                                  {isSubmitting ? <RefreshCwIcon className="w-5 h-5 animate-spin" /> : <CheckCircleIcon className="w-5 h-5" />}
                                  {isSubmitting ? 'Syncing...' : (isAiVideo ? 'Save Refinements' : 'Deploy Hub')}
                              </button>
                              {isAiVideo && (
                                  <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest text-center mt-4">Saving updates this kit for all future community scans</p>
                              )}
                          </div>
                      )}
                  </div>
              )}
              {activeTab === 'insights' && localVideo.insights && <div className="animate-fade-in"><ProjectInsights insights={localVideo.insights} /></div>}
              {activeTab === 'chat' && !isCreator && <div className="h-full animate-fade-in flex flex-col"><ChatInterface videoTitle={localVideo.title} products={[...localVideo.products, ...(localVideo.complementaryProducts || [])]} videoId={localVideo.id} trackEvent={trackEvent} /></div>}
              {activeTab === 'community' && isCreator && <div className="animate-fade-in space-y-8"><div className="text-center mb-10"><div className="w-16 h-16 bg-[#7D8FED]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#7D8FED]/20"><BarChartIcon className="w-8 h-8 text-[#7D8FED]" /></div><h3 className="text-xl font-black text-white tracking-tight">Teach One Impact</h3></div><div className="grid grid-cols-1 gap-4"><div className="bg-slate-900 p-6 rounded-3xl border border-slate-700 flex items-center justify-between"><div className="flex items-center gap-4"><div className="p-3 bg-rose-500/10 rounded-xl"><HeartIcon className="w-5 h-5 text-rose-500" isFilled={true} /></div><div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Library Saves</p><p className="text-2xl font-black text-white">{Math.floor(buildersCount * 1.5) + (localVideo.ratingCount || 0)}</p></div></div></div><div className="bg-slate-900 p-6 rounded-3xl border border-slate-700 flex items-center justify-between"><div className="flex items-center gap-4"><div className="p-3 bg-emerald-500/10 rounded-xl"><CheckCircleIcon className="w-5 h-5 text-emerald-500" /></div><div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mastery Validated</p><p className="text-2xl font-black text-white">{localVideo.ratingCount || 0} Builders</p></div></div></div></div></div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerView;
