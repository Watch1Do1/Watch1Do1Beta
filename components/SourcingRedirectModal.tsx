
import React from 'react';
import { CloseIcon, ShieldIcon, SparkleIcon, ExternalLinkIcon, CheckCircleIcon } from './IconComponents';

interface SourcingRedirectModalProps {
  url: string;
  itemCount: number;
  onClose: () => void;
}

const SourcingRedirectModal: React.FC<SourcingRedirectModalProps> = ({ url, itemCount, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[200] flex items-center justify-center p-4 animate-scale-in">
        <div className="bg-slate-800 border border-slate-700 rounded-[3rem] p-10 md:p-14 max-w-xl w-full shadow-2xl relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <SparkleIcon className="w-64 h-64 text-[#7D8FED]" />
            </div>

            <button onClick={onClose} className="absolute top-8 right-8 p-3 bg-slate-900 rounded-2xl text-slate-500 hover:text-white transition-all border border-slate-700">
                <CloseIcon className="w-5 h-5" />
            </button>

            <div className="relative z-10 text-center">
                <div className="w-24 h-24 bg-[#7D8FED]/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-[#7D8FED]/20 shadow-xl shadow-[#7D8FED]/5">
                    <ShieldIcon className="w-12 h-12 text-[#7D8FED]" />
                </div>
                
                <h2 className="text-4xl font-black text-white mb-4 tracking-tighter">Source Materials</h2>
                <p className="text-slate-400 mb-10 leading-relaxed font-medium">
                    Your planning kit of <span className="text-white font-black">{itemCount} items</span> is ready. We've identified the best sourcing options from our marketplace partners.
                </p>

                <div className="space-y-4">
                    <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        onClick={onClose}
                        className="w-full inline-flex items-center justify-center gap-4 py-6 bg-[#7D8FED] text-white font-black rounded-2xl shadow-2xl shadow-[#7D8FED]/20 hover:bg-[#6b7ae6] hover:scale-[1.02] transition-all uppercase tracking-[0.2em] text-xs"
                    >
                        Continue to Retailer <ExternalLinkIcon className="w-5 h-5" />
                    </a>
                    
                    <div className="flex items-center justify-center gap-3 py-4">
                        <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Affiliate Routing: Active</span>
                    </div>

                    <button 
                        onClick={onClose} 
                        className="text-[10px] font-black uppercase text-slate-600 hover:text-white transition-colors tracking-widest"
                    >
                        Return to Project
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default SourcingRedirectModal;
