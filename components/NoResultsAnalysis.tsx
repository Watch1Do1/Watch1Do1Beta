
import React, { useState } from 'react';
import { LinkIcon, PhotoIcon, SparkleIcon, SendIcon, YouTubeIcon, ExternalLinkIcon, LightBulbIcon, PlayIcon, RefreshCwIcon } from './IconComponents';

interface NoResultsAnalysisProps {
  searchQuery: string;
  onAnalyzeURL: () => void;
  onAnalyzeImage: () => void;
  onDirectAnalyze: (url: string) => void;
  isLoading?: boolean;
}

const NoResultsAnalysis: React.FC<NoResultsAnalysisProps> = ({ searchQuery, onAnalyzeURL, onAnalyzeImage, onDirectAnalyze, isLoading = false }) => {
  const [pastedUrl, setPastedUrl] = useState('');

  const handleDirectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pastedUrl.trim() && !isLoading) {
        onDirectAnalyze(pastedUrl.trim());
    }
  };

  const openExternalSearch = (platform: 'youtube' | 'tiktok') => {
      const query = encodeURIComponent(`${searchQuery} tutorial`);
      const url = platform === 'youtube' 
        ? `https://www.youtube.com/results?search_query=${query}`
        : `https://www.tiktok.com/search?q=${query}`;
      window.open(url, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl border border-slate-800">
          <SparkleIcon className="w-10 h-10 text-slate-700" />
        </div>
        <h3 className="text-4xl font-black text-white tracking-tighter mb-4">
          Hub Not Found for "{searchQuery}"
        </h3>
        <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px] mb-12 max-w-lg mx-auto leading-relaxed">
          No matching build hubs yet — want us to analyze an external tutorial for you? We'll extract the full tool kit instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
        {/* Main Proactive Action */}
        <div className="lg:col-span-3 space-y-8">
            <div className="bg-slate-800/40 border border-slate-700 p-8 rounded-[3rem] shadow-2xl">
                <h4 className="text-white font-black text-xs uppercase tracking-widest mb-6 flex items-center gap-3">
                    <PlayIcon className="w-4 h-4 text-[#7D8FED]" /> 
                    Paste Video Tutorial Link
                </h4>
                <form onSubmit={handleDirectSubmit} className="relative group mb-6">
                    <input 
                        type="url" 
                        value={pastedUrl}
                        onChange={(e) => setPastedUrl(e.target.value)}
                        placeholder="YouTube, TikTok, or Vimeo URL..."
                        className="w-full py-6 pl-8 pr-20 bg-slate-950 border-2 border-slate-800 rounded-[2rem] focus:border-[#7D8FED] outline-none text-white text-sm transition-all shadow-inner"
                    />
                    <button 
                        type="submit"
                        disabled={!pastedUrl.trim() || isLoading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-4 bg-[#7D8FED] text-white rounded-full hover:bg-[#6b7ae6] transition-all shadow-xl disabled:opacity-30 disabled:grayscale"
                    >
                        {isLoading ? <RefreshCwIcon className="w-5 h-5 animate-spin" /> : <SendIcon className="w-5 h-5" />}
                    </button>
                </form>
                
                <div className="flex flex-wrap items-center gap-4">
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Find a tutorial:</span>
                    <button 
                        onClick={() => openExternalSearch('youtube')}
                        className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-white hover:border-white/20 transition-all flex items-center gap-2"
                    >
                        <YouTubeIcon className="w-3.5 h-3.5" /> YouTube
                    </button>
                    <button 
                        onClick={() => openExternalSearch('tiktok')}
                        className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-white hover:border-white/20 transition-all flex items-center gap-2"
                    >
                        <ExternalLinkIcon className="w-3.5 h-3.5" /> TikTok
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={onAnalyzeURL}
                    className="flex flex-col items-center justify-center p-8 bg-slate-800/20 border border-slate-700 rounded-[2.5rem] hover:bg-slate-800/40 transition-all group"
                >
                    <LinkIcon className="w-6 h-6 text-slate-600 group-hover:text-[#7D8FED] mb-3" />
                    <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-white tracking-widest">Advanced Scan</span>
                </button>
                <button
                    onClick={onAnalyzeImage}
                    className="flex flex-col items-center justify-center p-8 bg-slate-800/20 border border-slate-700 rounded-[2.5rem] hover:bg-slate-800/40 transition-all group"
                >
                    <PhotoIcon className="w-6 h-6 text-slate-600 group-hover:text-[#7D8FED] mb-3" />
                    <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-white tracking-widest">Photo to Kit</span>
                </button>
            </div>
        </div>

        {/* Pro Tip Sidebar */}
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-amber-500/5 border border-amber-500/20 p-8 rounded-[2.5rem] relative overflow-hidden">
                <div className="absolute -top-4 -right-4 opacity-5">
                    <LightBulbIcon className="w-32 h-32 text-amber-500" />
                </div>
                <h4 className="text-amber-500 font-black text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <LightBulbIcon className="w-4 h-4" /> Pro-Tip: Hub Creation
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed font-medium mb-6">
                    Search YouTube or TikTok for <span className="text-white italic">"{searchQuery} tutorial"</span>. Find the most detailed build, copy its link, and paste it here.
                </p>
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-[9px] font-black text-amber-500">1</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight leading-tight">AI Scans frames for tools & materials.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-[9px] font-black text-amber-500">2</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight leading-tight">AI Cross-references merchant pricing.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-[9px] font-black text-amber-500">3</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight leading-tight">Your custom Project Hub is initialized.</p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default NoResultsAnalysis;
