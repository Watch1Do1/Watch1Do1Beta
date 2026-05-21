import React, { useState, useEffect } from 'react';
import { CloseIcon, ShieldIcon, SparkleIcon, SendIcon, RefreshCwIcon, CheckCircleIcon } from './IconComponents';
import { dbService } from '../services/dbService';

interface BetaNotificationModalProps {
  currentUserEmail?: string;
  onClose: () => void;
}

const BetaNotificationModal: React.FC<BetaNotificationModalProps> = ({ currentUserEmail, onClose }) => {
  const [showFeedback, setShowFeedback] = useState(false);
  const [email, setEmail] = useState(currentUserEmail || '');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    setIsSubmitting(true);
    try {
      await dbService.submitReport({
        reporterEmail: email || 'anonymous@watch1do1.com',
        category: 'beta_feedback',
        description: feedback,
        timestamp: new Date().toISOString()
      });
      setSuccess(true);
      setFeedback('');
      setTimeout(() => {
        setSuccess(false);
        setShowFeedback(false);
      }, 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl flex items-center justify-center z-[1000] p-4 sm:p-6 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-slate-800 rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] w-full max-w-xl border border-slate-700/50 flex flex-col overflow-hidden animate-scale-in relative">
        
        {/* Glow Ornament */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#7D8FED]/10 blur-[100px] rounded-full pointer-events-none" />

        {/* Header */}
        <div className="p-8 pb-5 flex items-center justify-between border-b border-slate-700/30 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#7D8FED]/10 rounded-xl flex items-center justify-center border border-[#7D8FED]/25">
              <SparkleIcon className="w-5 h-5 text-[#7D8FED]" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tighter">Watch1Do1 Public Beta</h2>
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">As of May 21, 2026</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 bg-slate-900 rounded-2xl text-slate-500 hover:text-white transition-all border border-slate-700/50"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-8 sm:p-10 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar relative z-10">
          
          <div className="space-y-4">
            <p className="text-sm font-bold text-slate-200 leading-relaxed text-center sm:text-left">
              We're in the final testing phase before official launch!
            </p>
            
            {/* Warning Callout Box */}
            <div className="bg-amber-500/5 border-l-4 border-amber-500 rounded-r-2xl p-4 sm:p-5 space-y-2">
              <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest block">⚠️ IMPORTANT DISCLAIMER</span>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                Any accounts created, videos analyzed, or kits saved during this beta period may be deleted when we go fully live (expected in the next 1–2 weeks).
              </p>
            </div>

            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Feel free to explore, create accounts, upload videos, and test everything. We'd love your honest feedback — it will directly shape the final product!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 pt-4 border-t border-slate-700/30">
            <button 
              onClick={onClose}
              className="w-full bg-[#7D8FED] text-white font-black py-5 rounded-2xl shadow-2xl shadow-[#7D8FED]/20 hover:bg-[#6b7ae6] hover:scale-[1.01] active:scale-95 transition-all text-center uppercase tracking-[0.2em] text-[10px] sm:text-xs"
            >
              Got it, let's explore!
            </button>
            
            <div className="text-center">
              <button 
                onClick={() => setShowFeedback(!showFeedback)}
                className="text-[10px] font-black uppercase text-[#7D8FED] hover:text-indigo-300 tracking-widest underline transition-colors"
              >
                {showFeedback ? "Hide Feedback Form" : "Report an issue / Give Feedback"}
              </button>
            </div>
          </div>

          {/* Feedback Form Slider */}
          {showFeedback && (
            <form onSubmit={handleSubmitFeedback} className="bg-slate-900/60 p-6 rounded-2xl border border-slate-700/50 space-y-4 animate-scale-in">
              <h3 className="text-xs font-black uppercase text-slate-300 tracking-widest flex items-center gap-2">
                ✉️ Dispatch Issue Report
              </h3>
              
              {success ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
                  <CheckCircleIcon className="w-6 h-6 text-emerald-500 mx-auto" />
                  <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Feedback Dispatched</p>
                  <p className="text-xs text-slate-400 font-medium">Thank you for helping us design the future of maker shops.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Your Email</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="maker@watch1do1.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-[#7D8FED]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Issue Details / Suggestion</label>
                    <textarea 
                      rows={3}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Spotted an issue or have an on-topic idea?"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-[#7D8FED] resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !feedback.trim()}
                    className="w-full py-4 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl font-black text-[9px] text-[#7D8FED] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" />
                        Dispatching...
                      </>
                    ) : (
                      <>
                        <SendIcon className="w-3.5 h-3.5" />
                        Submit Report
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default BetaNotificationModal;
