
import React, { useEffect } from 'react';
import { CloseIcon, HeartIcon, ExternalLinkIcon, ShieldIcon } from './IconComponents';

interface SupportModalProps {
  onClose: () => void;
  stripeUrl: string;
}

const SupportModal: React.FC<SupportModalProps> = ({ onClose, stripeUrl }) => {
  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center z-[200] p-4 sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-slate-800 rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] w-full max-w-lg border border-slate-700/50 flex flex-col overflow-hidden animate-scale-in">
        
        {/* Header */}
        <div className="p-8 pb-6 flex items-center justify-between border-b border-slate-700/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center border border-rose-500/20">
              <HeartIcon className="w-5 h-5 text-rose-500" isFilled={true} />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tighter">Support Watch1Do1</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 bg-slate-900 rounded-2xl text-slate-500 hover:text-white transition-all border border-slate-700"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 sm:p-10 space-y-8">
          <div className="space-y-4">
            <p className="text-lg font-bold text-white leading-relaxed">
              We’re building Watch1Do1 in public. 
            </p>
            <p className="text-sm text-slate-400 leading-relaxed font-medium">
              If this analysis saved you time or helped you prepare a project, optional support helps us keep improving the AI and cover development costs during beta.
            </p>
          </div>

          {/* Legal/Expectation Setting */}
          <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700/50 flex gap-4">
            <ShieldIcon className="w-6 h-6 text-[#7D8FED] shrink-0 mt-1" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
              Transparent Notice: This is not an investment, does not provide equity, and comes with no guaranteed features or timelines.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <a 
              href={stripeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-grow bg-[#7D8FED] text-white font-black py-6 px-4 rounded-2xl shadow-2xl shadow-[#7D8FED]/20 hover:bg-[#6b7ae6] hover:scale-[1.02] active:scale-95 transition-all text-center uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2"
            >
              Support with Stripe <ExternalLinkIcon className="w-4 h-4" />
            </a>
            <button 
              onClick={onClose}
              className="px-8 py-6 bg-slate-900 text-slate-400 font-black rounded-2xl hover:bg-slate-700 hover:text-white transition-all uppercase tracking-[0.2em] text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportModal;
