
import React from 'react';
import { CloseIcon, ShieldIcon, SparkleIcon, ExternalLinkIcon, CheckCircleIcon } from './IconComponents';

import { CartItem } from '../types';

interface SourcingRedirectModalProps {
  items: CartItem[];
  onClose: () => void;
}

const SourcingRedirectModal: React.FC<SourcingRedirectModalProps> = ({ items, onClose }) => {
  const handleLaunchAll = () => {
    // Open up to 5 items to avoid browser blocking
    items.slice(0, 5).forEach((item, index) => {
      setTimeout(() => {
        window.open(item.purchaseUrl, '_blank');
      }, index * 300);
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[200] flex items-center justify-center p-4 animate-scale-in">
        <div className="bg-slate-800 border border-slate-700 rounded-[3rem] p-8 md:p-12 max-w-2xl w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <SparkleIcon className="w-64 h-64 text-[#7D8FED]" />
            </div>

            <button onClick={onClose} className="absolute top-6 right-6 p-3 bg-slate-900 rounded-2xl text-slate-500 hover:text-white transition-all border border-slate-700">
                <CloseIcon className="w-5 h-5" />
            </button>

            <div className="relative z-10 text-center">
                <div className="w-20 h-20 bg-[#7D8FED]/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-[#7D8FED]/20">
                    <ShieldIcon className="w-10 h-10 text-[#7D8FED]" />
                </div>
                
                <h2 className="text-3xl font-black text-white mb-2 tracking-tighter">Sourcing Materials</h2>
                <p className="text-slate-400 mb-8 leading-relaxed text-sm">
                    Your planning kit of <span className="text-white font-black">{items.length} items</span> is ready for sourcing.
                </p>

                <div className="max-h-[300px] overflow-y-auto custom-scrollbar mb-8 pr-2 space-y-3">
                    {items.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700">
                            <div className="flex items-center gap-3 min-w-0">
                                <img src={item.imageUrl} className="w-8 h-8 rounded-lg object-cover" alt="" />
                                <div className="text-left min-w-0">
                                    <p className="text-[10px] font-bold text-white truncate">{item.name}</p>
                                    <p className="text-[8px] text-slate-500 uppercase tracking-widest">{item.retailer}</p>
                                </div>
                            </div>
                            <a 
                                href={item.purchaseUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="p-2 text-[#7D8FED] hover:text-white bg-[#7D8FED]/10 rounded-lg transition-all"
                            >
                                <ExternalLinkIcon className="w-4 h-4" />
                            </a>
                        </div>
                    ))}
                </div>

                <div className="space-y-4">
                    <button 
                        onClick={handleLaunchAll}
                        className="w-full inline-flex items-center justify-center gap-4 py-5 bg-[#7D8FED] text-white font-black rounded-2xl shadow-2xl shadow-[#7D8FED]/20 hover:bg-[#6b7ae6] hover:scale-[1.02] transition-all uppercase tracking-[0.2em] text-xs"
                    >
                        Source All Materials ({Math.min(items.length, 5)}) <ExternalLinkIcon className="w-5 h-5" />
                    </button>
                    {items.length > 5 && (
                        <p className="text-[8px] text-slate-500 uppercase tracking-widest">Limited to first 5 items to avoid browser restrictions</p>
                    )}
                    
                    <div className="flex items-center justify-center gap-3 py-2">
                        <CheckCircleIcon className="w-3 h-3 text-emerald-500" />
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Affiliate Routing: Active</span>
                    </div>

                    <button 
                        onClick={onClose} 
                        className="text-[9px] font-black uppercase text-slate-600 hover:text-white transition-colors tracking-widest"
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
