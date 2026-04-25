import React, { useState } from 'react';
import { CloseIcon, SparkleIcon, DollarSignIcon, CheckCircleIcon } from './IconComponents';

interface StripeTipModalProps {
  creatorName: string;
  onClose: () => void;
  onConfirmTip: (amount: number) => void;
}

const StripeTipModal: React.FC<StripeTipModalProps> = ({ creatorName, onClose, onConfirmTip }) => {
  const [selectedAmount, setSelectedAmount] = useState<number>(5);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'amount' | 'processing' | 'success'>('amount');

  const amounts = [5, 10, 25, 50];
  const fee = selectedAmount * 0.15;
  const netToCreator = selectedAmount - fee;

  const handlePay = () => {
    setIsProcessing(true);
    setStep('processing');
    setTimeout(() => {
        setIsProcessing(false);
        setStep('success');
        onConfirmTip(selectedAmount);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm border border-slate-700/50 transform transition-all duration-300 scale-95 animate-scale-in overflow-hidden">
        <div className="relative p-8">
          {step !== 'processing' && (
              <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors">
                <CloseIcon className="w-6 h-6" />
              </button>
          )}

          {step === 'amount' && (
              <div className="animate-fade-in">
                  <div className="flex flex-col items-center text-center mb-8">
                      <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4 border border-amber-500/30">
                          <DollarSignIcon className="w-8 h-8 text-amber-500" />
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-1">Tip {creatorName}</h2>
                      <p className="text-slate-400 text-sm">Directly support this Maker's future builds.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                      {amounts.map((amt) => (
                          <button
                            key={amt}
                            onClick={() => setSelectedAmount(amt)}
                            className={`py-4 rounded-2xl font-black text-xl transition-all border-2 ${
                                selectedAmount === amt 
                                ? 'bg-amber-500 border-amber-400 text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.3)]' 
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                            }`}
                          >
                              ${amt}
                          </button>
                      ))}
                  </div>

                  <div className="bg-slate-800/50 rounded-xl p-3 mb-8 border border-slate-700/50">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                          <span>Creator Receives</span>
                          <span>Platform Fee</span>
                      </div>
                      <div className="flex justify-between font-bold">
                          <span className="text-emerald-400">${netToCreator.toFixed(2)}</span>
                          <span className="text-slate-500">${fee.toFixed(2)}</span>
                      </div>
                  </div>

                  <button
                    onClick={handlePay}
                    className="w-full bg-[#7D8FED] text-white font-bold py-4 rounded-2xl shadow-xl shadow-[#7D8FED]/20 hover:bg-[#6b7ae6] transition-all flex items-center justify-center gap-2"
                  >
                    Pay ${selectedAmount.toFixed(2)} with Stripe
                  </button>
                  <p className="text-[10px] text-center text-slate-500 mt-4 uppercase font-bold tracking-widest">
                      Secure checkout powered by Stripe
                  </p>
              </div>
          )}

          {step === 'processing' && (
              <div className="py-12 text-center animate-fade-in">
                  <div className="w-16 h-16 border-4 border-[#7D8FED]/20 border-t-[#7D8FED] rounded-full animate-spin mx-auto mb-6"></div>
                  <h3 className="text-xl font-bold text-white mb-2">Connecting to Stripe...</h3>
                  <p className="text-slate-400 text-sm italic">"Securing your contribution to the build..."</p>
              </div>
          )}

          {step === 'success' && (
              <div className="py-12 text-center animate-fade-in">
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
                      <CheckCircleIcon className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2">Build Supported!</h3>
                  <p className="text-slate-400 text-sm mb-6">You just boosted {creatorName}'s workshop.</p>
                  <div className="bg-[#7D8FED]/20 text-[#7D8FED] py-2 px-4 rounded-full text-xs font-black uppercase tracking-widest inline-flex items-center gap-2 animate-bounce">
                      <SparkleIcon className="w-4 h-4" /> +50 Maker XP
                  </div>
                  <button onClick={onClose} className="w-full mt-8 py-3 text-slate-300 font-bold hover:text-white transition-colors">Close</button>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StripeTipModal;