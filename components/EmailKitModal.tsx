
import React, { useState, useEffect, useRef } from 'react';
import { CloseIcon, SendIcon, SparkleIcon, CheckCircleIcon, RefreshCwIcon, ShoppingCartIcon } from './IconComponents';
import { CartItem } from '../types';

interface EmailKitModalProps {
  items: CartItem[];
  projectTitle: string;
  onClose: () => void;
  onSend: (email: string) => Promise<void>;
}

const EmailKitModal: React.FC<EmailKitModalProps> = ({ items, projectTitle, onClose, onSend }) => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(timer);
  }, []);

  const isValidEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
        setEmailError("Destination required");
        return;
    }
    if (!isValidEmail(email)) {
        setEmailError("Please enter a valid email address");
        return;
    }

    setIsSending(true);
    try {
      await onSend(email);
      setIsSuccess(true);
    } catch (err) {
      setEmailError("Transmission error. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleEmailChange = (val: string) => {
      setEmail(val);
      if (emailError) setEmailError(null);
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[150] flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-[3rem] p-10 max-w-md w-full shadow-2xl animate-scale-in relative">
        <button onClick={onClose} className="absolute top-6 right-8 text-slate-500 hover:text-white transition-all hover:rotate-90 p-2 z-20">
          <CloseIcon className="w-6 h-6" />
        </button>

        {!isSuccess ? (
          <div className="animate-fade-in">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-[#7D8FED]/10 rounded-2xl flex items-center justify-center border border-[#7D8FED]/20">
                    <SendIcon className="w-8 h-8 text-[#7D8FED]" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tighter">Digital Payload</h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Ready for the workbench</p>
                </div>
            </div>

            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700 mb-8">
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ShoppingCartIcon className="w-3 h-3" /> Manifest Preview
                </p>
                <ul className="space-y-2 mb-4">
                    {items.slice(0, 3).map(item => (
                        <li key={item.name} className="text-xs text-white font-bold truncate flex items-center gap-2">
                            <span className="text-[#7D8FED]">•</span> {item.name}
                        </li>
                    ))}
                    {items.length > 3 && (
                        <li className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-4">
                            + {items.length - 3} more items
                        </li>
                    )}
                </ul>
                <p className="text-[10px] text-slate-500 leading-relaxed italic border-t border-slate-800 pt-4">
                    Includes high-res photos, build reasoning, and acquisition links.
                </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <label htmlFor="email-input" className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 block mb-3">Destination Email</label>
                <input 
                    ref={inputRef}
                    id="email-input"
                    type="email" 
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="maker@workbench.com"
                    aria-label="Email address for sending project kit"
                    className={`w-full bg-slate-950 border rounded-2xl py-5 px-6 text-white text-lg font-bold focus:ring-4 focus:ring-[#7D8FED]/5 outline-none transition-all shadow-inner ${
                        emailError ? 'border-rose-500' : 'border-slate-700 focus:border-[#7D8FED]'
                    }`}
                    required
                />
                {emailError && (
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-2 ml-1 animate-fade-in">
                        {emailError}
                    </p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                  <button 
                    type="submit"
                    disabled={isSending}
                    className={`w-full py-5 bg-[#7D8FED] text-white font-black rounded-2xl uppercase tracking-[0.2em] text-xs shadow-xl shadow-[#7D8FED]/20 hover:bg-[#6b7ae6] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 ${isSending ? 'animate-pulse' : ''}`}
                  >
                    {isSending ? <RefreshCwIcon className="w-5 h-5 animate-spin" /> : <SparkleIcon className="w-5 h-5" />}
                    {isSending ? `Syncing to ${email.split('@')[0]}...` : 'Dispatch to Workbench'}
                  </button>
                  <p className="text-[8px] text-center text-slate-600 font-bold uppercase tracking-widest">Powered by Resend Transmission Protocol</p>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center py-6 animate-fade-in flex flex-col items-center" aria-live="polite">
            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-8 border border-emerald-500/20 shadow-2xl shadow-emerald-500/5">
              <CheckCircleIcon className="w-12 h-12 text-emerald-500" />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tighter mb-4">Payload Dispatched</h2>
            <p className="text-slate-400 text-sm mb-10 leading-relaxed max-w-[280px]">
                The complete manifest for <span className="text-[#7D8FED] font-black">"{projectTitle}"</span> is waiting in your inbox.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full">
                <button 
                    onClick={onClose} 
                    className="flex-1 py-5 bg-slate-700 text-white font-black rounded-2xl hover:bg-slate-600 transition-all uppercase tracking-[0.2em] text-[10px]"
                >
                    Close
                </button>
                <button 
                    onClick={() => { setIsSuccess(false); setEmail(''); }}
                    className="flex-[1.5] py-5 bg-[#7D8FED] text-white font-black rounded-2xl hover:bg-[#6b7ae6] transition-all uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-[#7D8FED]/20"
                >
                    Send to Another
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailKitModal;
