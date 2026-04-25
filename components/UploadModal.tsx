
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { XCircleIcon, PlusIcon, SparkleIcon, UploadIcon, RefreshCwIcon, CheckCircleIcon, ShieldIcon, SearchIcon } from './IconComponents';
import { ProjectCategory, User, Product } from '../types';

interface UploadModalProps {
  onClose: () => void;
  onUpload: (file: File, title: string, category: ProjectCategory, suggestedCategory?: string, description?: string, manualProducts?: Product[]) => void;
  isLoading: boolean;
  loadingMessage: string;
  currentUser: User | null;
  onNavigate?: (view: any) => void;
}

const CATEGORIES: ProjectCategory[] = [
  'Home Improvement', 'DIY Crafts', 'Cooking & Kitchen', 'Gardening', 
  'Tech & Gadgets', 'Fitness & Sports', 'Automotive', 'Fashion & Beauty', 
  'Kids & Toys', 'Survival & Outdoors', 'Music', 'Pets & Animal Care', 
  'Art & Photography', 'Hobbies', 'Other'
];

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const DESCRIPTION_LIMIT = 500;

const UploadModal: React.FC<UploadModalProps> = ({ onClose, onUpload, isLoading, loadingMessage, currentUser, onNavigate }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ProjectCategory>('Home Improvement');
  const [suggestedCategory, setSuggestedCategory] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [legalConfirmed, setLegalConfirmed] = useState(false);
  
  // Manual Product Injection State (Future Marketplace Integration)
  const [manualSearch, setManualSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const modalHeaderRef = useRef<HTMLDivElement>(null);

  const isVerified = currentUser?.isVerifiedPartner;

  // AGGRESSIVE SCROLL LOCK: Resets scroll to top after browser layout and autofocus
  useLayoutEffect(() => {
    const resetScroll = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      window.scrollTo(0, 0);
    };

    // First attempt immediately
    resetScroll();

    // Second attempt after paint to catch autofocus jumps
    const frameId = requestAnimationFrame(() => {
      resetScroll();
      // Ensure the header or container itself has focus to stop input autofocus jumps
      scrollContainerRef.current?.focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(frameId);
  }, []);

  // Auto-clear error after 6 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Keyboard support (Esc to close)
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isLoading) handleClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [file, title, description, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || isSubmitting) return;
    if (!isVerified && !legalConfirmed) {
        setError('Verification Required: Please affirm content rights.');
        return;
    }
    
    setIsSubmitting(true);
    try {
        await onUpload(file, title, category, category === 'Other' ? suggestedCategory : undefined, description, selectedProducts);
    } catch (err) {
        setError('Transmission Failed: Hub gateway rejected the payload. Try again.');
        setIsSubmitting(false);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    if (!selectedFile.type.startsWith('video/')) {
        setError('Format Error: Please select a valid video stream.');
        return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
        setError('Size Error: Media payload exceeds 500MB limit.');
        return;
    }
    setFile(selectedFile);
    if (!title) {
        const fileName = selectedFile.name.replace(/\.[^/.]+$/, "");
        setTitle(fileName.charAt(0).toUpperCase() + fileName.slice(1));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) validateAndSetFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) validateAndSetFile(droppedFile);
  };

  const handleClose = () => {
      if ((file || title || description.length > 0) && !isLoading) {
          if (window.confirm("Discarding Build Protocol? Changes will not be cached in the library.")) {
              onClose();
          }
      } else {
          onClose();
      }
  };

  const clearFile = (e: React.MouseEvent) => {
      e.stopPropagation();
      setFile(null);
      setDuration(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleMetadata = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const vid = e.currentTarget;
    const mins = Math.floor(vid.duration / 60);
    const secs = Math.floor(vid.duration % 60);
    setDuration(`${mins}:${secs.toString().padStart(2, '0')}`);
  };

  const removeManualProduct = (id: string) => {
      setSelectedProducts(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div 
      ref={scrollContainerRef} 
      tabIndex={-1}
      className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] overflow-y-auto custom-scrollbar flex flex-col items-center outline-none"
    >
      <div className="min-h-full w-full flex items-start justify-center p-4 sm:p-8 pt-10 sm:pt-20 pb-20">
        <div className="bg-slate-800 border border-slate-700 rounded-[3rem] max-w-2xl w-full shadow-2xl overflow-hidden animate-scale-in flex flex-col">
          {isLoading ? (
            <div className="p-24 text-center animate-fade-in flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-20 h-20 relative mb-10">
                  <div className="absolute inset-0 border-4 border-[#7D8FED]/20 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-[#7D8FED] border-t-transparent rounded-full animate-spin"></div>
                  <SparkleIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-[#7D8FED] animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2 tracking-tighter">{loadingMessage}</h2>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Analyzing frame sequences...</p>
            </div>
          ) : (
            <>
              <div ref={modalHeaderRef} className="relative p-8 pb-4 flex items-center justify-between border-b border-slate-700/30 flex-shrink-0">
                 <div className="flex items-center gap-6">
                    <div className="p-4 rounded-2xl bg-[#7D8FED]/10 border border-[#7D8FED]/30">
                      <UploadIcon className="w-8 h-8 text-[#7D8FED]" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white tracking-tighter leading-tight">Partner Hub Onboarding</h2>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1.5">Authoritative Build Protocol</p>
                    </div>
                 </div>
                 <button onClick={handleClose} className="p-2 text-slate-500 hover:text-white transition-all hover:rotate-90">
                    <XCircleIcon className="w-8 h-8" />
                 </button>
              </div>

              <div className="p-8 md:p-10">
                <form onSubmit={handleSubmit} className="space-y-10">
                  
                  {/* Identity Protocol Instruction */}
                  {!isVerified && (
                    <div className="bg-[#7D8FED]/5 border border-[#7D8FED]/20 rounded-2xl p-5 flex items-start gap-4">
                        <ShieldIcon className="w-5 h-5 text-[#7D8FED] flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[10px] font-black text-[#7D8FED] uppercase tracking-widest mb-1">Integrity Protocol v1.0</p>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                For verification & safety, please include your username or a visible slate in the first 10 seconds of the video (e.g. <span className="text-white font-bold italic">“Uploaded to Watch1Do1 by @{currentUser?.displayName || 'YourName'}”</span>).
                            </p>
                        </div>
                    </div>
                  )}

                  {isVerified && (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 flex items-start gap-4">
                        <CheckCircleIcon className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Authoritative Partner Access</p>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                You are uploading as a Verified Partner. Your manual SKU selections will be locked as the <span className="text-white font-bold">Official Kit</span> for this project.
                            </p>
                        </div>
                    </div>
                  )}

                  {/* File Interface */}
                  <div 
                    onClick={() => !file && fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-[2.5rem] p-10 text-center transition-all group overflow-hidden ${
                        file ? 'border-[#7D8FED]/30 bg-slate-900/40' : 
                        isDragging ? 'border-[#7D8FED] bg-[#7D8FED]/5' : 'border-slate-700 hover:border-[#7D8FED]/50 hover:bg-slate-700/20 cursor-pointer'
                    }`}
                  >
                    <input type="file" accept="video/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    
                    {file ? (
                        <div className="flex flex-col items-center gap-4 animate-fade-in relative z-10">
                            <div className="w-full max-w-[320px] aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl relative border border-white/10 group/vid">
                                <video 
                                  src={URL.createObjectURL(file)} 
                                  className="w-full h-full object-cover" 
                                  muted 
                                  onLoadedMetadata={handleMetadata}
                                  onMouseEnter={e => e.currentTarget.play()}
                                  onMouseLeave={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                />
                                <button 
                                  type="button"
                                  onClick={clearFile}
                                  className="absolute top-3 right-3 p-2 bg-rose-600/90 text-white rounded-xl hover:bg-rose-500 transition-all border border-white/10 shadow-xl opacity-0 group-hover/vid:opacity-100"
                                  title="Clear Selection"
                                >
                                    <XCircleIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-black text-white tracking-tight truncate max-w-xs mx-auto">{file.name}</p>
                                <p className="text-[10px] font-black text-[#7D8FED] uppercase tracking-widest mt-1">
                                  {(file.size / 1024 / 1024).toFixed(1)} MB • {duration || 'Detecting...'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="py-6">
                            <UploadIcon className={`w-12 h-12 mx-auto mb-6 transition-all ${isDragging ? 'text-[#7D8FED] scale-110' : 'text-slate-700 group-hover:text-slate-500'}`} />
                            <p className="text-slate-400 font-black text-xl mb-1 tracking-tight">Sync Media Stream</p>
                            <p className="text-slate-600 text-[10px] uppercase font-black tracking-widest">Drop tutorial footage or click to explore</p>
                        </div>
                    )}
                  </div>

                  {error && (
                      <div role="alert" aria-live="polite" className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl animate-fade-in flex items-center gap-3">
                          <XCircleIcon className="w-5 h-5 text-rose-500 flex-shrink-0" />
                          <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">{error}</p>
                      </div>
                  )}

                  <div className="space-y-8">
                      {/* Category Selector (Chips Matrix) */}
                      <div className="space-y-4">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 block">Project Vector (Category)</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-2 p-1">
                              {CATEGORIES.map(cat => (
                                  <button
                                      key={cat}
                                      type="button"
                                      onClick={() => setCategory(cat)}
                                      className={`py-3 px-3 rounded-xl text-[8px] font-black uppercase tracking-tight text-center transition-all border ${
                                          category === cat 
                                          ? 'bg-[#7D8FED] border-[#7D8FED] text-white shadow-lg' 
                                          : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                                      }`}
                                  >
                                      {cat}
                                  </button>
                              ))}
                          </div>
                          {category === 'Other' && (
                              <input 
                                  type="text" 
                                  value={suggestedCategory} 
                                  onChange={(e) => setSuggestedCategory(e.target.value)} 
                                  placeholder="Propose new hub identity..."
                                  className="w-full bg-slate-900 border border-[#7D8FED]/30 rounded-2xl px-6 py-4 text-xs text-white focus:border-[#7D8FED] outline-none transition-all mt-4 animate-fade-in" 
                                  required 
                              />
                          )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Build Signature (Title)</label>
                              <input 
                                  ref={titleInputRef}
                                  type="text" 
                                  value={title} 
                                  onChange={(e) => setTitle(e.target.value)} 
                                  placeholder="e.g. Masterwork Walnut Desk"
                                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 text-white text-sm focus:border-[#7D8FED] outline-none transition-all shadow-inner" 
                                  required 
                              />
                          </div>
                          
                          <div className="space-y-2 relative">
                              <div className="flex justify-between items-center ml-2 mb-2">
                                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Project Brief (AI Context)</label>
                                  <span className={`text-[8px] font-black ${description.length >= DESCRIPTION_LIMIT ? 'text-rose-500' : 'text-slate-600'}`}>
                                      {description.length} / {DESCRIPTION_LIMIT}
                                  </span>
                              </div>
                              <textarea 
                                  value={description} 
                                  onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_LIMIT))} 
                                  placeholder="Optional: Mention tool brands, material sources, safety notes, or any context that helps AI extraction..."
                                  rows={3}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 text-white text-sm focus:border-[#7D8FED] outline-none transition-all shadow-inner resize-none" 
                              />
                          </div>
                      </div>
                  </div>

                  {/* Manual Product Injection Section (Future Marketplace Integration) */}
                  {isVerified && (
                    <div className="space-y-4 pt-4 border-t border-slate-700/30 animate-fade-in">
                        <div className="flex items-center justify-between ml-2">
                            <div className="flex items-center gap-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Marketplace Integration</label>
                                <div className="px-1.5 py-0.5 bg-[#7D8FED]/10 border border-[#7D8FED]/30 rounded text-[7px] font-black text-[#7D8FED] uppercase tracking-widest">Affiliate Mode</div>
                            </div>
                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Inject sourcing links</span>
                        </div>
                        
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input 
                                    type="text" 
                                    value={manualSearch} 
                                    onChange={(e) => setManualSearch(e.target.value)} 
                                    placeholder="Search marketplace (Coming Soon)..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 text-white text-sm focus:border-[#7D8FED] outline-none transition-all shadow-inner pr-12 opacity-50 cursor-not-allowed" 
                                    disabled
                                />
                                <button 
                                    type="button"
                                    disabled
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-500 opacity-30"
                                >
                                    <SearchIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Selected Manual Products */}
                        {selectedProducts.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-2">Selected for Build Kit ({selectedProducts.length})</p>
                                <div className="flex wrap gap-2">
                                    {selectedProducts.map(prod => (
                                        <div key={prod.id} className="flex items-center gap-2 bg-[#7D8FED]/10 border border-[#7D8FED]/30 rounded-full pl-2 pr-1 py-1 animate-scale-in">
                                            <span className="text-[10px] font-bold text-white px-1 truncate max-w-[150px]">{prod.name}</span>
                                            <button 
                                                type="button"
                                                onClick={() => removeManualProduct(prod.id)}
                                                className="p-1 text-slate-400 hover:text-rose-500 transition-all"
                                            >
                                                <XCircleIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                  )}

                  {/* Legal Affirmation */}
                  {!isVerified && (
                    <div 
                      className="p-8 bg-slate-900/50 rounded-[2.5rem] border border-slate-700/50 flex gap-6 group cursor-pointer select-none items-center" 
                      onClick={() => setLegalConfirmed(!legalConfirmed)}
                      aria-describedby="legal-text"
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
                        <p id="legal-text" className="text-[11px] text-slate-400 leading-relaxed font-medium">
                            I confirm this is my original work or I have all necessary rights/permissions to upload and share it. I understand that uploading infringing content may result in account termination and legal consequences.
                        </p>
                    </div>
                  )}

                  <div className="pt-6">
                      <button 
                          type="submit" 
                          disabled={!file || !title || (!isVerified && !legalConfirmed) || isSubmitting} 
                          aria-invalid={!legalConfirmed && !isVerified}
                          className={`w-full py-6 bg-[#7D8FED] disabled:bg-slate-700 disabled:opacity-30 text-white font-black rounded-2xl shadow-2xl shadow-[#7D8FED]/20 hover:scale-[1.01] active:scale-98 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.3em] text-xs ${isSubmitting ? 'animate-pulse' : ''}`}
                      >
                          {isSubmitting ? <RefreshCwIcon className="w-5 h-5 animate-spin" /> : <CheckCircleIcon className="w-5 h-5" />}
                          {isSubmitting ? 'Syncing Authoritative Data...' : 'Publish Official Build Hub'}
                      </button>
                      <p className="text-[8px] text-center text-slate-600 font-bold uppercase tracking-widest mt-5 mb-4">
                          Vision AI performs multi-modal telemetry. High frame rates improve material recognition.
                      </p>
                      {onNavigate && (
                          <div className="text-center pb-8">
                              <button 
                                  type="button"
                                  onClick={() => { onClose(); onNavigate('affiliateGuide'); }}
                                  className="text-[9px] text-[#7D8FED] font-black uppercase tracking-widest hover:underline"
                              >
                                  Affiliate Guide for Creators
                              </button>
                          </div>
                      )}
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
export default UploadModal;
