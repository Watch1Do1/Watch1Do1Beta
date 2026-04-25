import React from 'react';
import { CloseIcon, SparkleIcon, MedalIcon, CheckCircleIcon } from './IconComponents';

interface SubscriptionModalProps {
  onClose: () => void;
  onSubscribe: () => void;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ onClose, onSubscribe }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-700/50 transform transition-all duration-300 animate-scale-in overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-[#7D8FED] to-blue-400"></div>
        <div className="relative p-8 md:p-10">
          <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors p-2 hover:bg-slate-700 rounded-xl">
            <CloseIcon className="w-6 h-6" />
          </button>
          
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-amber-500/10 mb-6 border border-amber-500/20 shadow-2xl shadow-amber-500/5">
              <MedalIcon className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2 tracking-tighter">Maker Plus</h2>
            <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-500/10">
              <SparkleIcon className="w-3 h-3" /> Beta Founder Status
            </div>
          </div>
          
          <ul className="space-y-5 text-slate-300 mb-10">
            {[
              { title: "0% Tipping Fees", desc: "100% of support reaches creators." },
              { title: "Founder Badge", desc: "Permanent status on your profile." },
              { title: "Locked-in Rate", desc: "Keep $5.99/mo for the life of your account." }
            ].map((item, idx) => (
              <li key={idx} className="flex items-start gap-4">
                <div className="flex-shrink-0 bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20 mt-0.5">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-black text-white leading-none mb-1">{item.title}</p>
                  <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <button
            onClick={onSubscribe}
            className="w-full bg-[#7D8FED] text-white font-black py-5 px-6 rounded-2xl shadow-2xl shadow-[#7D8FED]/20 hover:bg-[#6b7ae6] transition-all active:scale-95 uppercase tracking-[0.2em] text-xs"
          >
            Initialize for $5.99/mo
          </button>
          
          <div className="mt-8 pt-8 border-t border-slate-700/50">
              <p className="text-[9px] text-center text-slate-500 leading-relaxed font-bold uppercase tracking-wider">
                  Secure checkout via Stripe • Cancel anytime • Automatic monthly billing
              </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;