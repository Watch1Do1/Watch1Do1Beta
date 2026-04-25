
import React, { useState } from 'react';
import { CloseIcon, SparkleIcon, CheckCircleIcon, MedalIcon, DollarSignIcon, XCircleIcon, ArrowLeftIcon, TrophyIcon, CameraIcon, ShoppingCartIcon, ShieldIcon } from './IconComponents';
import { SubscriptionStatus } from '../types';
import { APP_CONFIG } from '../constants';

interface ManageSubscriptionModalProps {
  onClose: () => void;
  currentStatus: SubscriptionStatus;
  onSubscriptionChange: (newStatus: SubscriptionStatus, interval?: string) => void;
}

const ManageSubscriptionModal: React.FC<ManageSubscriptionModalProps> = ({ onClose, currentStatus, onSubscriptionChange }) => {
  const isPlus = currentStatus === 'Plus';
  const isPro = currentStatus === 'Pro';
  const isStudio = currentStatus === 'Studio';
  const isSubscribed = isPlus || isPro || isStudio;
  const [selectedTier, setSelectedTier] = useState<'Plus' | 'Pro' | 'Studio'>('Pro');
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');

  const tiers: Record<'Plus' | 'Pro' | 'Studio', {
    label: string;
    monthlyPrice: string;
    annualPrice: string;
    popular: boolean;
    tagline: string;
    description: string;
    benefits: string[];
    comingSoon?: boolean;
  }> = {
    Plus: {
      label: 'Creator Plus',
      monthlyPrice: '$5.99',
      annualPrice: '$59',
      popular: false,
      tagline: 'Support & Monetization Literacy',
      description: 'The standard for supporting makers while unlocking project memory.',
      benefits: [
        "Creator Support Badge",
        "QR Tipping (Venmo/PayPal)",
        "Project Memory & Saved Builds",
        "Creator Profile Highlighting",
        "Affiliate Education Access"
      ]
    },
    Pro: { 
      label: 'Pro Creator', 
      monthlyPrice: '$9.99', 
      annualPrice: '$99', 
      popular: true,
      tagline: 'Income-Generating Authority',
      description: 'Declare authority, earn from builds, and take responsibility for logic.',
      benefits: [
        "Declare 1-3 Canonical Items",
        "Personal Affiliate Link Support",
        "Verified Build Authority",
        "Priority AI Logic Extraction",
        "Everything in Creator Plus"
      ]
    },
    Studio: { 
      label: 'Studio Lead', 
      monthlyPrice: '$24.99', 
      annualPrice: '$249', 
      popular: false,
      tagline: 'Scale & Performance',
      description: 'For high-output studios and full-time professional creators.',
      benefits: [
        "Unlimited Declared Items",
        "Deeper Demand Analytics",
        "Brand Partnership Eligibility",
        "Lock Canonical Kit Logic",
        "Custom Studio Hub Branding"
      ]
    }
  };

  const handleCancelSubscription = () => {
    if (window.confirm("Security Protocol: Are you sure you want to terminate your Creator Tier? You will lose authoritative build rights and tipping privileges at the end of your cycle.")) {
      onSubscriptionChange('Free');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center z-[110] p-4 sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-slate-800 border border-slate-700 rounded-[3rem] max-w-2xl w-full max-h-[92vh] shadow-[0_50px_100px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden animate-scale-in">
        
        {/* Fixed Header */}
        <div className="relative p-8 pb-6 border-b border-slate-700/50 bg-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
             <div className="h-10 w-10 relative flex items-center justify-center">
                <img 
                  src={APP_CONFIG.LOGO_PATH} 
                  alt="L" 
                  className="h-full w-full object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                />
                <SparkleIcon className="h-8 w-8 text-amber-500 hidden" />
             </div>
             <div>
                <h2 id="modal-title" className="text-xl font-black text-white tracking-tighter uppercase tracking-[0.2em] text-[11px]">Maker Tier Management</h2>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Founder Access Controls</p>
             </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 bg-slate-900 rounded-2xl text-slate-500 hover:text-white transition-all hover:scale-110 active:scale-90 border border-slate-700 shadow-xl"
            aria-label="Close"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-grow overflow-y-auto custom-scrollbar p-8 sm:p-10 space-y-10 min-h-0">
          <div className="text-center">
            <h2 className="text-4xl font-black text-white tracking-tighter mb-4 leading-tight">
              {isSubscribed ? `${currentStatus} Tier Active` : 'Deploy Your Creator Studio'}
            </h2>
            <p className="text-slate-400 font-medium leading-relaxed max-w-md mx-auto text-sm">
              Unlock the right to declare canonical materials, earn through authority, and scale your influence.
            </p>
          </div>

          {!isSubscribed && (
            <div className="flex justify-center mb-4">
              <div className="bg-slate-900 border border-slate-700 p-1.5 rounded-[2rem] flex items-center gap-1">
                <button
                  onClick={() => setBillingInterval('monthly')}
                  className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    billingInterval === 'monthly' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingInterval('annual')}
                  className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all relative flex items-center gap-2 ${
                    billingInterval === 'annual' ? 'bg-[#7D8FED] text-white shadow-lg' : 'text-slate-500 hover:text-white'
                  }`}
                >
                  Annually
                  <span className="bg-emerald-500 text-[8px] px-2 py-0.5 rounded-full text-white animate-pulse">Save 25%</span>
                </button>
              </div>
            </div>
          )}
          
          <div className="space-y-8">
            {!isSubscribed && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4" role="radiogroup" aria-label="Subscription Tiers">
                    {(Object.keys(tiers) as Array<keyof typeof tiers>).map((key) => (
                        <button
                            key={key}
                            onClick={() => !tiers[key].comingSoon && setSelectedTier(key)}
                            aria-checked={selectedTier === key}
                            disabled={tiers[key].comingSoon}
                            role="radio"
                            className={`relative p-8 rounded-[2.5rem] border-2 transition-all flex flex-col text-left group ${
                                selectedTier === key 
                                ? 'bg-[#7D8FED]/15 border-[#7D8FED] shadow-2xl shadow-[#7D8FED]/20 scale-[1.03] z-10' 
                                : tiers[key].comingSoon 
                                  ? 'bg-slate-900/30 border-slate-800 opacity-60 cursor-not-allowed'
                                  : 'bg-slate-900/50 border-slate-700 hover:border-slate-500'
                            }`}
                        >
                            {tiers[key].popular && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-amber-500 text-slate-900 shadow-lg">
                                    Most Popular
                                </span>
                            )}
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 group-hover:text-white transition-colors">
                                {tiers[key].label}
                                {selectedTier === key && <span className="ml-2 text-[#7D8FED]">• Selected</span>}
                            </span>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-3xl font-black text-white">
                                  {billingInterval === 'monthly' ? tiers[key].monthlyPrice : tiers[key].annualPrice}
                                </span>
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                                  {billingInterval === 'monthly' ? '/ month' : '/ year'}
                                </span>
                            </div>

                            <p className="text-[9px] font-black text-[#7D8FED] uppercase tracking-widest mb-2">{tiers[key].tagline}</p>
                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed mb-4">{tiers[key].description}</p>
                            
                            <div className="space-y-3 mt-auto border-t border-slate-800 pt-4">
                                {tiers[key].benefits.map((benefit, i) => (
                                    <div key={i} className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                        <CheckCircleIcon className="w-3 h-3 text-emerald-500" />
                                        {benefit}
                                    </div>
                                ))}
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {isSubscribed && (
                <div className={`p-8 rounded-[2.5rem] border transition-all bg-[#7D8FED]/5 border-[#7D8FED]/20`}>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
                            <TrophyIcon className="w-5 h-5 text-amber-500" />
                        </div>
                        <h3 className="text-xl font-black text-white tracking-tight">{currentStatus} Tier Active</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                      {tiers[currentStatus as keyof typeof tiers].benefits.map((benefit, i) => (
                        <div key={i} className="flex items-center gap-3 text-[10px] text-slate-300 font-bold uppercase tracking-tight group">
                          <div className="flex-shrink-0 bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20 transition-colors group-hover:border-[#7D8FED]/50 group-hover:bg-[#7D8FED]/10">
                            <CheckCircleIcon className="w-4 h-4 text-emerald-500 transition-colors group-hover:text-[#7D8FED]" />
                          </div>
                          <span className="leading-tight">{benefit}</span>
                        </div>
                      ))}
                    </div>
                </div>
            )}
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-8 border-t border-slate-700/50 bg-slate-900/60 backdrop-blur-xl flex-shrink-0">
          <div className="space-y-6">
            {isSubscribed ? (
                <div className="space-y-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[1.5rem] flex items-center justify-center gap-4">
                        <CheckCircleIcon className="w-6 h-6 text-emerald-500" />
                        <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">{currentStatus} Status Verified</span>
                    </div>
                    <div className="text-center">
                        <button 
                            onClick={handleCancelSubscription}
                            className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-500 transition-colors py-2"
                        >
                            Cancel & Revert to Free Plan
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                  <button 
                    onClick={() => onSubscriptionChange(selectedTier, billingInterval)}
                    className="w-full py-6 bg-[#7D8FED] text-white font-black rounded-2xl shadow-2xl shadow-[#7D8FED]/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.2em] text-xs"
                  >
                    <DollarSignIcon className="w-6 h-6 text-white" />
                    Activate {tiers[selectedTier].label} • {billingInterval === 'monthly' ? tiers[selectedTier].monthlyPrice : tiers[selectedTier].annualPrice}
                  </button>
                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-4">
                        <MedalIcon className="w-3 h-3 text-amber-500" />
                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Founders Rate Locked</span>
                      </div>
                      <p className="text-[8px] text-slate-600 font-black uppercase tracking-[0.2em] mb-4">
                         Authority Rights Granted Immediately • Cancel Anytime
                      </p>
                    <button 
                        onClick={onClose}
                        className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all py-1 hover:translate-y-[-2px] inline-flex items-center gap-2"
                    >
                        <ArrowLeftIcon className="w-4 h-4" /> Return to Studio
                    </button>
                  </div>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageSubscriptionModal;
