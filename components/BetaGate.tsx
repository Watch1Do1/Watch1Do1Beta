
import React, { useState, useEffect } from 'react';
import { ShieldIcon, SparkleIcon, CheckCircleIcon, RefreshCwIcon, ArrowLeftIcon, KeyIcon } from './IconComponents';

interface BetaGateProps {
  onUnlock: () => void;
}

const BETA_KEY = "BUILD-2025"; // Change this to your preferred access code

const BetaGate: React.FC<BetaGateProps> = ({ onUnlock }) => {
  const [inputKey, setInputKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'verifying' | 'error' | 'success'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;

    setStatus('verifying');
    
    // Simulate a secure handshake delay
    setTimeout(() => {
        if (inputKey.toUpperCase() === BETA_KEY) {
            setStatus('success');
            setTimeout(onUnlock, 1000);
        } else {
            setStatus('error');
            setErrorMsg("Handshake Rejected: Invalid Access Token.");
            setInputKey('');
            setTimeout(() => setStatus('idle'), 2000);
        }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-[#020617] z-[999] flex items-center justify-center p-4 sm:p-8">
        {/* Background Atmosphere */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#7D8FED]/5 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full"></div>
        </div>

        <div className="max-w-md w-full relative z-10 animate-scale-in">
            <div className="bg-slate-800 border border-slate-700/50 rounded-[3.5rem] p-10 md:p-12 shadow-[0_50px_100px_rgba(0,0,0,0.8)] text-center relative overflow-hidden">
                {/* Branding Icon */}
                <div className="mb-10 relative inline-block">
                    <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto border-2 transition-all duration-500 ${
                        status === 'success' ? 'bg-emerald-500/10 border-emerald-500/30' : 
                        status === 'error' ? 'bg-rose-500/10 border-rose-500/30' : 
                        'bg-[#7D8FED]/10 border-[#7D8FED]/30 shadow-2xl shadow-[#7D8FED]/10'
                    }`}>
                        {status === 'success' ? (
                            <CheckCircleIcon className="w-12 h-12 text-emerald-500" />
                        ) : status === 'error' ? (
                            <ShieldIcon className="w-12 h-12 text-rose-500" />
                        ) : (
                            <KeyIcon className={`w-12 h-12 text-[#7D8FED] ${status === 'verifying' ? 'animate-pulse' : ''}`} />
                        )}
                    </div>
                    {status === 'verifying' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-28 h-28 border-2 border-dashed border-[#7D8FED]/40 rounded-[3rem] animate-spin"></div>
                        </div>
                    )}
                </div>

                <div className="mb-10">
                    <h1 className="text-3xl font-black text-white tracking-tighter mb-3">Watch1Do1 Hub</h1>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Node v4.2.0 • Secured Prototype</p>
                </div>

                <p className="text-slate-400 text-sm mb-10 leading-relaxed font-medium">
                    This is a restricted developer preview. Please enter your <span className="text-white font-bold italic">Handshake Key</span> to initialize the workshop logic.
                </p>

                <form onSubmit={handleVerify} className="space-y-6">
                    <div className="relative group">
                        <input 
                            type="text" 
                            autoFocus
                            placeholder="Handshake Key"
                            value={inputKey}
                            onChange={(e) => setInputKey(e.target.value)}
                            disabled={status === 'verifying' || status === 'success'}
                            className={`w-full bg-slate-900 border-2 rounded-2xl py-5 px-8 text-center text-lg font-mono tracking-[0.3em] uppercase transition-all outline-none ${
                                status === 'error' ? 'border-rose-500 text-rose-500 animate-shake' : 
                                status === 'success' ? 'border-emerald-500 text-emerald-500' :
                                'border-slate-700 text-white focus:border-[#7D8FED] focus:ring-[15px] focus:ring-[#7D8FED]/5'
                            }`}
                        />
                        {status === 'error' && (
                            <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-3 animate-fade-in">{errorMsg}</p>
                        )}
                    </div>

                    <button 
                        type="submit"
                        disabled={!inputKey || status === 'verifying' || status === 'success'}
                        className={`w-full py-6 bg-white text-slate-950 font-black rounded-2xl shadow-2xl transition-all uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 active:scale-95 ${
                            status === 'verifying' ? 'opacity-50 grayscale' : 'hover:bg-slate-100 hover:scale-[1.02]'
                        }`}
                    >
                        {status === 'verifying' ? (
                            <> <RefreshCwIcon className="w-5 h-5 animate-spin" /> Synchronizing... </>
                        ) : status === 'success' ? (
                            <> <CheckCircleIcon className="w-5 h-5" /> Authorized </>
                        ) : (
                            "Initialize Access"
                        )}
                    </button>
                </form>
            </div>
            
            <div className="mt-10 text-center flex flex-col items-center gap-4 opacity-40">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-relaxed">
                    © 2025 Watch1Do1 Experimental Group. <br/> 
                    Proprietary Algorithm. Unauthorized access is logged.
                </p>
                <div className="flex items-center gap-3">
                    <ShieldIcon className="w-4 h-4 text-slate-700" />
                    <SparkleIcon className="w-4 h-4 text-slate-700" />
                </div>
            </div>
        </div>
        
        <style>{`
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-8px); }
                75% { transform: translateX(8px); }
            }
            .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
        `}</style>
    </div>
  );
};

export default BetaGate;
