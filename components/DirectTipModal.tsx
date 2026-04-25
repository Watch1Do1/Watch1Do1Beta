
import React, { useState, useEffect, useMemo } from 'react';
import { CloseIcon, SparkleIcon, DollarSignIcon, CheckCircleIcon, ExternalLinkIcon, MedalIcon, ShieldIcon, RefreshCwIcon, UserIcon, ScanFrameIcon, ShareIcon } from './IconComponents';
import { User } from '../types';

interface DirectTipModalProps {
  creatorName: string;
  qrUrl?: string;
  venmoHandle?: string;
  currentUser: User | null;
  onClose: () => void;
  onSignalTip: (amount: number) => void;
  onSignupClick?: () => void;
  onShare?: () => void;
}

const PRESET_AMOUNTS = [5, 10, 20, 50];

const DirectTipModal: React.FC<DirectTipModalProps> = ({ 
    creatorName, qrUrl, venmoHandle, currentUser, onClose, onSignalTip, onSignupClick, onShare 
}) => {
  const [hasSignalled, setHasSignalled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tipAmount, setTipAmount] = useState<string>('5.00');

  const hasGateway = !!(qrUrl || venmoHandle);

  useEffect(() => {
    if (hasSignalled) {
      const timer = setTimeout(onClose, 8000); // Increased time to allow share action
      return () => clearTimeout(timer);
    }
  }, [hasSignalled, onClose]);

  const calculatedXP = useMemo(() => {
    const amt = parseFloat(tipAmount) || 0;
    if (amt <= 0) return 0;
    return 50 + (amt * 2);
  }, [tipAmount]);

  const handleSignal = () => {
      const numAmount = parseFloat(tipAmount);
      if (!isNaN(numAmount) && numAmount > 0) {
          setIsProcessing(true);
          setTimeout(() => {
              setHasSignalled(true);
              setIsProcessing(false);
              onSignalTip(numAmount);
          }, 800);
      }
  };

  const handleAmountChange = (val: string) => {
    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
        setTipAmount(val);
    }
  };

  const handleBlur = () => {
      const num = parseFloat(tipAmount);
      if (!isNaN(num)) {
          setTipAmount(num.toFixed(2));
      }
  };

  const cleanHandle = venmoHandle?.replace('@', '');
  const venmoUrl = cleanHandle ? `https://venmo.com/${cleanHandle}` : null;

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[110] p-4 backdrop-blur-2xl overflow-y-auto">
      <div className="bg-slate-800 rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.9)] w-full max-w-md border border-slate-700/50 overflow-hidden animate-scale-in flex flex-col my-auto">
        <div className="relative p-8 md:p-10 flex-grow">
          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition-all hover:rotate-90 bg-slate-900 rounded-xl border border-slate-700 z-20"
          >
            <CloseIcon className="w-6 h-6" />
          </button>

          {!hasSignalled ? (
              <div className="animate-fade-in text-center flex flex-col items-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-500/10 rounded-[2.5rem] mb-6 border border-amber-500/20 shadow-2xl shadow-amber-500/5">
                      <DollarSignIcon className="w-10 h-10 text-amber-500" />
                  </div>
                  <h2 className="text-3xl font-black text-white tracking-tighter mb-2">Direct Maker Support</h2>
                  <p className="text-slate-400 text-sm mb-8 leading-relaxed max-w-[280px]">
                      Boost <span className="text-[#7D8FED] font-black">@{creatorName}</span> directly via their preferred gateway.
                  </p>

                  <div className="w-full bg-slate-900 p-8 rounded-[2.5rem] border border-slate-700 shadow-inner mb-8 relative group overflow-hidden">
                      {!hasGateway ? (
                           <div className="py-12 text-center">
                               <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                                  <ShieldIcon className="w-6 h-6 text-rose-500" />
                               </div>
                               <p className="text-rose-500 font-black text-[10px] uppercase tracking-widest">Gateway Inactive</p>
                               <p className="text-slate-600 text-[9px] mt-2 px-6 font-bold leading-relaxed">
                                   This creator hasn't enabled their P2P gateway. Join the waitlist to receive alerts when their hub is monetized.
                               </p>
                           </div>
                      ) : (
                          <>
                            <div className="absolute top-4 left-0 right-0 flex justify-center items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-emerald-500"></div>
                                <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Verified P2P Endpoint Active</span>
                            </div>
                            
                            {qrUrl ? (
                                <div className="relative pt-6 flex flex-col items-center">
                                    <div className="w-full max-w-[180px] aspect-square p-3 bg-white rounded-3xl overflow-hidden shadow-2xl mb-6">
                                        <img src={qrUrl} alt="Creator Tip QR" className="w-full h-full object-contain" />
                                    </div>
                                    <p className="text-[9px] font-black text-amber-500 uppercase tracking-[0.3em]">Scan to Support</p>
                                </div>
                            ) : (
                                <div className="py-6 flex flex-col items-center">
                                    <div className="w-full max-w-[180px] aspect-square bg-slate-950 rounded-[2rem] flex flex-col items-center justify-center border-2 border-dashed border-slate-800 mb-6">
                                        <ScanFrameIcon className="w-10 h-10 text-slate-800 mb-2" />
                                        <p className="text-[10px] font-black text-white">@{venmoHandle}</p>
                                    </div>
                                    {venmoUrl && (
                                        <a href={venmoUrl} target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-[#3D95CE] text-white font-black rounded-xl hover:scale-105 transition-all shadow-xl uppercase text-[10px] tracking-widest flex items-center gap-2">
                                            Open Venmo Profile <ExternalLinkIcon className="w-4 h-4" />
                                        </a>
                                    )}
                                </div>
                            )}
                          </>
                      )}
                  </div>

                  <div className="w-full space-y-6">
                      <div className="flex flex-wrap justify-center gap-3">
                          {PRESET_AMOUNTS.map(amt => (
                              <button key={amt} onClick={() => setTipAmount(amt.toFixed(2))} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${parseFloat(tipAmount) === amt ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-lg' : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'}`}>${amt}</button>
                          ))}
                      </div>

                      <div className="relative">
                        <div className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-500 font-black text-lg">$</div>
                        <input type="text" inputMode="decimal" value={tipAmount} onChange={(e) => handleAmountChange(e.target.value)} onBlur={handleBlur} className="w-full bg-slate-950 border border-slate-700 rounded-2xl py-6 pl-14 pr-6 text-white text-xl font-black focus:border-amber-500 outline-none transition-all shadow-inner text-center" />
                      </div>

                      <button 
                        onClick={handleSignal}
                        disabled={!hasGateway || !tipAmount || parseFloat(tipAmount) <= 0 || isProcessing}
                        className="w-full py-6 bg-[#7D8FED] text-white font-black rounded-2xl uppercase tracking-[0.2em] text-xs shadow-2xl hover:bg-[#6b7ae6] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:bg-slate-700"
                      >
                          {isProcessing ? <RefreshCwIcon className="w-5 h-5 animate-spin" /> : <SparkleIcon className="w-5 h-5" />}
                          Signal ${tipAmount || '0.00'} Support {currentUser && `(+${calculatedXP} XP)`}
                      </button>
                      
                      <div className="flex items-center justify-center gap-3 px-8 opacity-60">
                        <ShieldIcon className="w-4 h-4 text-emerald-500" />
                        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest text-center">Watch1Do1 does not process these funds. Signal acts as proof of P2P support.</p>
                      </div>
                  </div>
              </div>
          ) : (
              <div className="animate-fade-in text-center py-10 flex flex-col items-center">
                  <div className="w-24 h-24 bg-emerald-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-emerald-500/20 shadow-xl shadow-emerald-500/10">
                      <CheckCircleIcon className="w-16 h-16 text-emerald-500" />
                  </div>
                  <h3 className="text-3xl font-black text-white tracking-tighter mb-4">Support Verified</h3>
                  <p className="text-slate-400 text-sm mb-10 leading-relaxed max-w-xs mx-auto">Your proof of support for <span className="text-white font-bold">@{creatorName}</span> has been logged. {currentUser ? 'XP has been added to your profile.' : 'Join the hub to claim your XP reward.'}</p>
                  
                  <div className="flex flex-col gap-4 w-full">
                      <button onClick={onClose} className="w-full py-6 bg-white text-slate-900 font-black rounded-2xl shadow-xl uppercase tracking-[0.2em] text-xs hover:bg-slate-100 transition-all">Return to Hub</button>
                      
                      {onShare && (
                          <button 
                            onClick={() => { onClose(); onShare(); }} 
                            className="w-full py-5 bg-[#7D8FED] text-white font-black rounded-2xl uppercase tracking-[0.2em] text-xs hover:bg-[#6b7ae6] shadow-xl shadow-[#7D8FED]/20 flex items-center justify-center gap-3"
                          >
                              <ShareIcon className="w-5 h-5" /> Promote This Hub
                          </button>
                      )}
                  </div>
                  
                  <p className="mt-6 text-[8px] font-black text-slate-600 uppercase tracking-widest animate-pulse">Session closing in 8 seconds...</p>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DirectTipModal;
