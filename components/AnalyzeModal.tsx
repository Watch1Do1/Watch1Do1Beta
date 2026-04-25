
import React, { useState, useRef, useEffect } from 'react';
import { UploadType, ProjectCategory, User } from '../types';
import { SparkleIcon, XCircleIcon, PlusIcon, CameraIcon, ScanFrameIcon, YouTubeIcon, PhotoIcon, LinkIcon, PlayIcon, LightBulbIcon, ChevronDownIcon, CheckCircleIcon, RefreshCwIcon, ShieldIcon } from './IconComponents';

interface AnalyzeModalProps {
  onClose: () => void;
  onAnalyze: (type: UploadType, value: File[] | string, category: ProjectCategory) => void;
  onAuthPrompt: (mode: 'login' | 'signup') => void;
  isLoading: boolean;
  loadingMessage: string;
  initialTab: UploadType;
  initialUrl?: string;
  initialCategory?: ProjectCategory;
  currentUser: User | null;
  onNavigate?: (view: any) => void;
}

const CATEGORIES: ProjectCategory[] = [
  'Home Improvement', 'DIY Crafts', 'Cooking & Kitchen', 'Gardening', 
  'Tech & Gadgets', 'Fitness & Sports', 'Automotive', 'Fashion & Beauty', 
  'Kids & Toys', 'Survival & Outdoors', 'Music', 'Pets & Animal Care', 
  'Art & Photography', 'Hobbies', 'Other'
];

const AnalyzeModal: React.FC<AnalyzeModalProps> = ({ 
    onClose, onAnalyze, onAuthPrompt, isLoading, loadingMessage, 
    initialTab, initialUrl = '', initialCategory = 'Home Improvement', currentUser, onNavigate 
}) => {
  const [activeTab, setActiveTab] = useState<UploadType>(initialTab);
  const [category, setCategory] = useState<ProjectCategory>(initialCategory);
  const [url, setUrl] = useState(initialUrl);
  const [files, setFiles] = useState<File[]>([]);
  const [showBriefing, setShowBriefing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [legalConfirmed, setLegalConfirmed] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isVerified = currentUser?.isVerifiedPartner;

  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);
  useEffect(() => { if (initialUrl) setUrl(initialUrl); }, [initialUrl]);
  useEffect(() => { if (initialCategory) setCategory(initialCategory); }, [initialCategory]);
  useEffect(() => { if (activeTab === UploadType.CAMERA) startCamera(); else stopCamera(); return () => stopCamera(); }, [activeTab]);

  // Fix: Force scroll to top on mount
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
    }
  }, []);

  // First-use briefing logic
  useEffect(() => {
    const hasSeen = localStorage.getItem('w1d1_analyze_briefing_seen');
    if (!hasSeen) {
        setShowBriefing(true);
        localStorage.setItem('w1d1_analyze_briefing_seen', 'true');
    }
  }, []);

  // Auto-clear error after 6 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Auto-clear error when input changes manually too
  useEffect(() => {
    if (error) setError(null);
  }, [url, files, activeTab]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      setCameraStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { 
        setError("Camera Access Denied: Vision Scanner requires hardware permission.");
        setActiveTab(UploadType.YOUTUBE); 
    }
  };

  const stopCamera = () => { if (cameraStream) { cameraStream.getTracks().forEach(track => track.stop()); setCameraStream(null); } };

  const isValidUrl = (testUrl: string) => {
    try {
        const u = new URL(testUrl);
        return u.protocol === "http:" || u.protocol === "https:";
    } catch {
        return false;
    }
  };

  const captureCameraFrame = () => {
    if (!videoRef.current || !canvasRef.current || !cameraStream) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Shutter Flash Effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        onAnalyze(UploadType.CAMERA, [new File([blob], `toolbox_scan_${Date.now()}.jpg`, { type: 'image/jpeg' })], category);
      }
    }, 'image/jpeg', 0.92);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser && !isVerified && !legalConfirmed) {
        setError("Legal Check Required: Please affirm content rights.");
        return;
    }

    if (activeTab === UploadType.CAMERA) {
        captureCameraFrame();
        return;
    }

    if (activeTab === UploadType.IMAGE) {
        if (files.length === 0 && currentUser) {
            setError("Logic Error: At least one visual token is required.");
            return;
        }
        onAnalyze(UploadType.IMAGE, files, category);
    } else {
        if (!url.trim()) return;
        if (!isValidUrl(url) && currentUser) {
            setError("Format Error: Please enter a valid workshop URL.");
            return;
        }
        onAnalyze(activeTab, url, category);
    }
  };

  const removeFileToken = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getTabLabel = (id: UploadType) => {
      switch(id) {
          case UploadType.CAMERA: return { icon: ScanFrameIcon, label: 'Toolbox Logic', sub: 'Workbench AI Scan' };
          case UploadType.YOUTUBE: return { icon: PlayIcon, label: 'Media Scanner', sub: 'TikTok, YouTube, Vimeo' };
          case UploadType.IMAGE: return { icon: PhotoIcon, label: 'Token Ingestion', sub: 'Screenshots & Blueprints' };
          default: return { icon: LinkIcon, label: 'Web Pulse', sub: 'Blog & Shop Specification' };
      }
  };

  const getPlaceholder = () => {
    if (activeTab === UploadType.YOUTUBE) return "Paste tutorial URL (e.g. YouTube, TikTok)...";
    if (activeTab === UploadType.URL) return "Paste shop or blog URL for spec analysis...";
    return "Initializing frame stream...";
  };

  const tabInfo = getTabLabel(activeTab);

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[120] overflow-y-auto no-scrollbar">
      <div className="min-h-screen flex items-start justify-center p-4 sm:p-8 pt-10 sm:pt-20">
        <div ref={scrollRef} className="bg-slate-800 border border-slate-700/50 rounded-[3rem] max-w-2xl w-full my-auto shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden animate-scale-in flex flex-col">
          {isLoading ? (
            <div className="p-24 text-center animate-fade-in flex flex-col items-center flex-grow justify-center">
              <div className="w-20 h-20 relative mb-10">
                  <div className="absolute inset-0 border-4 border-[#7D8FED]/20 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-[#7D8FED] border-t-transparent rounded-full animate-spin"></div>
                  <SparkleIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-[#7D8FED] animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2 tracking-tighter">{loadingMessage}</h2>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Engaging Vision Intelligence...</p>
            </div>
          ) : (
            <>
              <div className="relative p-8 pb-4 flex items-center justify-between border-b border-slate-700/30 flex-shrink-0">
                 <div className="flex items-center gap-6">
                    <div className={`p-4 rounded-2xl flex-shrink-0 border transition-all ${activeTab === UploadType.CAMERA ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[#7D8FED]/10 border-[#7D8FED]/30'}`}>
                        <tabInfo.icon className={`w-8 h-8 ${activeTab === UploadType.CAMERA ? 'text-emerald-500' : 'text-[#7D8FED]'}`} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white tracking-tighter leading-tight">{tabInfo.label}</h2>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1.5">{tabInfo.sub}</p>
                    </div>
                 </div>
                 <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-all hover:rotate-90">
                    <XCircleIcon className="w-8 h-8" />
                 </button>
              </div>

              <div className="p-8 md:p-10 space-y-8 overflow-y-auto custom-scrollbar max-h-[70vh]">
                <div className="flex bg-slate-900/60 p-2 rounded-[2rem] mb-2 border border-slate-700/50 shadow-inner flex-shrink-0">
                  {[UploadType.YOUTUBE, UploadType.IMAGE, UploadType.CAMERA, UploadType.URL].map(tabId => {
                      const info = getTabLabel(tabId as UploadType);
                      return (
                          <button 
                              key={tabId} 
                              onClick={() => { setActiveTab(tabId as UploadType); }} 
                              className={`flex-1 flex flex-col items-center gap-1.5 py-4 px-2 rounded-2xl transition-all ${
                                  activeTab === tabId 
                                  ? 'bg-[#7D8FED] text-white shadow-2xl shadow-[#7D8FED]/30 translate-y-[-2px]' 
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                          >
                              <info.icon className="w-5 h-5" />
                              <span className="text-[8px] font-black uppercase tracking-widest">{tabId === UploadType.URL ? 'Pulse' : tabId === UploadType.CAMERA ? 'Scan' : info.label.split(' ')[0]}</span>
                          </button>
                      )
                  })}
                </div>

                <div className="mb-2">
                    <button 
                      onClick={() => setShowBriefing(!showBriefing)}
                      className="w-full flex items-center justify-between p-5 bg-slate-900/40 rounded-2xl border border-slate-700 group hover:border-amber-500/30 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <LightBulbIcon className="w-5 h-5 text-amber-500" />
                            <div className="text-left">
                              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white">Operational Briefing</span>
                              <span className="block text-[8px] font-bold text-slate-600 uppercase tracking-widest">Protocol v4.5 Deployment</span>
                            </div>
                        </div>
                        <ChevronDownIcon className={`w-4 h-4 text-slate-600 transition-transform ${showBriefing ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showBriefing && (
                        <div className="mt-4 p-8 bg-slate-900 rounded-[2.5rem] border border-amber-500/20 animate-fade-in relative overflow-hidden">
                            <p className="text-[11px] font-black text-amber-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                               <CheckCircleIcon className="w-3.5 h-3.5" /> Intelligence Protocol
                            </p>
                            <ul className="space-y-4 relative z-10">
                                {[
                                    "Position workbench hardware within the logic grid.",
                                    "High-resolution frames improve material recognition.",
                                    "Vision AI cross-references global merchant inventories.",
                                    "Result: Unified shopping payloads in seconds."
                                ].map((step, i) => (
                                    <li key={i} className="flex gap-4 items-start">
                                        <div className="flex-shrink-0 w-6 h-6 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700">
                                            <span className="text-[9px] font-black text-slate-500">0{i+1}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 font-medium leading-relaxed">{step}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div>
                      {activeTab === UploadType.CAMERA ? (
                        <div className="relative aspect-video bg-slate-900 rounded-[2.5rem] overflow-hidden border-2 border-slate-700 shadow-2xl">
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                            <canvas ref={canvasRef} className="hidden" />
                            <div className="vision-scan-line text-emerald-500"></div>
                            
                            <button
                              type="button"
                              onClick={currentUser ? captureCameraFrame : () => onAuthPrompt('login')}
                              disabled={!cameraStream}
                              className="absolute bottom-8 left-1/2 -translate-x-1/2 px-10 py-5 bg-emerald-600 text-white font-black rounded-[1.5rem] shadow-2xl hover:bg-emerald-500 transition-all flex items-center gap-4 z-20 uppercase tracking-[0.2em] text-[10px] active:scale-95 disabled:opacity-50"
                            >
                              <ScanFrameIcon className="w-5 h-5" />
                              {currentUser ? 'Capture Logic Frame' : 'Login to Scan'}
                            </button>

                            {!currentUser && (
                                <div className="absolute bottom-2 left-0 right-0 text-center z-20">
                                    <p className="text-[7px] font-black text-amber-500 uppercase tracking-widest animate-pulse bg-slate-900/80 py-1 px-4 inline-block rounded-full">Login required to save results</p>
                                </div>
                            )}

                            <div className="absolute inset-0 pointer-events-none border-[30px] border-slate-950/40"></div>
                            <div className="absolute top-8 left-8 w-10 h-10 border-t-4 border-l-4 border-emerald-500/60 rounded-tl-xl animate-pulse"></div>
                            <div className="absolute top-8 right-8 w-10 h-10 border-t-4 border-r-4 border-emerald-500/60 rounded-tr-xl animate-pulse"></div>
                            <div className="absolute bottom-8 left-8 w-10 h-10 border-b-4 border-l-4 border-emerald-500/60 rounded-bl-xl animate-pulse"></div>
                            <div className="absolute bottom-8 right-8 w-10 h-10 border-b-4 border-r-4 border-emerald-500/60 rounded-br-xl animate-pulse"></div>
                        </div>
                      ) : activeTab === UploadType.IMAGE ? (
                        <div className="space-y-6">
                          <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-700 rounded-[2.5rem] p-12 text-center hover:border-[#7D8FED] hover:bg-[#7D8FED]/5 cursor-pointer transition-all group relative overflow-hidden">
                              <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => {if(e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);}} />
                              <PhotoIcon className="w-12 h-12 text-slate-700 group-hover:text-[#7D8FED] mx-auto mb-6 transition-all group-hover:scale-110" />
                              <p className="text-slate-400 font-black text-xl mb-1 tracking-tight">Initialize Frame Sequence</p>
                              <p className="text-slate-600 text-[10px] uppercase font-black tracking-widest">Select screenshots or material lists</p>
                          </div>
                          
                          {files.length > 0 && (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 animate-fade-in">
                                  {files.map((f, i) => (
                                      <div key={i} className="group/token relative aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-xl">
                                          <img src={URL.createObjectURL(f)} className="w-full h-full object-cover opacity-60 group-hover/token:opacity-100 transition-opacity" alt="" />
                                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent"></div>
                                          <p className="absolute bottom-3 left-3 right-8 text-[8px] font-black text-white uppercase tracking-tighter truncate">{f.name}</p>
                                          <button 
                                              type="button"
                                              onClick={(e) => { e.stopPropagation(); removeFileToken(i); }}
                                              className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-lg opacity-0 group-hover/token:opacity-100 transition-opacity hover:bg-rose-500"
                                          >
                                              <XCircleIcon className="w-3.5 h-3.5" />
                                          </button>
                                      </div>
                                  ))}
                              </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="relative group">
                              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#7D8FED] transition-colors">
                                  <PlayIcon className="w-6 h-6" />
                              </div>
                              <input 
                                  type="url" 
                                  value={url} 
                                  onChange={(e) => setUrl(e.target.value)} 
                                  placeholder={getPlaceholder()}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-3xl py-6 pl-16 pr-8 text-white placeholder-slate-600 focus:border-[#7D8FED] focus:ring-[15px] focus:ring-[#7D8FED]/5 outline-none transition-all shadow-inner font-bold" 
                                  required 
                              />
                          </div>
                        </div>
                      )}
                  </div>

                  {/* Legal Affirmation */}
                  {!isVerified && (
                    <div 
                      className="p-8 bg-slate-900/50 rounded-[2.5rem] border border-slate-700/50 flex gap-6 group cursor-pointer select-none items-center" 
                      onClick={() => setLegalConfirmed(!legalConfirmed)}
                      aria-describedby="legal-text-analyze"
                    >
                        <div 
                          className={`w-10 h-10 rounded-xl border-2 flex-shrink-0 flex items-center justify-center transition-all ${legalConfirmed ? 'bg-[#7D8FED] border-[#7D8FED] scale-110' : 'border-slate-700 group-hover:border-slate-500'}`}
                          role="checkbox"
                          aria-checked={legalConfirmed}
                          tabIndex={0}
                          onKeyDown={(e) => { if(e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setLegalConfirmed(!legalConfirmed); } }}
                        >
                            {legalConfirmed && <CheckCircleIcon className="w-6 h-6 text-white" />}
                        </div>
                        <p id="legal-text-analyze" className="text-[11px] text-slate-400 leading-relaxed font-medium">
                            I confirm this is my original work or I have all necessary rights/permissions to analyze and share this content. I understand that uploading infringing content may result in account termination.
                        </p>
                    </div>
                  )}

                  {error && (
                      <div role="alert" aria-live="polite" className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-2xl animate-fade-in flex items-center gap-4">
                          <XCircleIcon className="w-6 h-6 text-rose-500 flex-shrink-0" />
                          <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest leading-relaxed">{error}</p>
                      </div>
                  )}
                  
                  <div className="flex flex-col md:flex-row items-center gap-6 pt-4 flex-shrink-0">
                      <div className="flex-grow w-full">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-3 ml-2">Project Classification:</label>
                          <select value={category} onChange={(e) => setCategory(e.target.value as ProjectCategory)} className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-[#7D8FED] shadow-xl appearance-none cursor-pointer">
                              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                      </div>
                      {activeTab !== UploadType.CAMERA && (
                          <div className="w-full md:w-auto flex flex-col gap-2">
                            <button 
                                type={currentUser ? "submit" : "button"} 
                                onClick={currentUser ? undefined : () => onAuthPrompt('login')}
                                disabled={isLoading} 
                                className="w-full md:w-auto px-10 py-5 bg-[#7D8FED] text-white font-black rounded-2xl uppercase tracking-[0.2em] text-[10px] shadow-[0_20px_40px_rgba(125,143,237,0.3)] active:scale-95 transition-all hover:bg-[#6b7ae6] flex items-center justify-center gap-3 flex-shrink-0 disabled:opacity-50"
                            >
                                {isLoading ? <RefreshCwIcon className="w-5 h-5 animate-spin" /> : <SparkleIcon className="w-5 h-5" />}
                                {currentUser ? 'Initialize Analysis' : 'Login to Analyze'}
                            </button>
                            {!currentUser && !isLoading && (
                                <p className="text-[7px] font-black text-amber-500 uppercase tracking-widest text-center animate-pulse">Login required to save results</p>
                            )}
                          </div>
                      )}
                  </div>
                  {onNavigate && (
                      <div className="text-center pt-6 pb-4">
                          <button 
                              type="button"
                              onClick={() => { onClose(); onNavigate('affiliateGuide'); }}
                              className="text-[9px] text-[#7D8FED] font-black uppercase tracking-widest hover:underline"
                          >
                              Affiliate Guide for Creators
                          </button>
                      </div>
                  )}
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
export default AnalyzeModal;
