
import React, { useState, useEffect } from 'react';
import { CloseIcon, SparkleIcon, ArrowLeftIcon, ShieldIcon, EyeIcon, EyeOffIcon, CheckCircleIcon, SendIcon } from './IconComponents';
import { APP_CONFIG } from '../constants';

interface AuthModalProps {
  mode: 'login' | 'signup' | 'forgot-password';
  onClose: () => void;
  onSwitchMode: (mode: 'login' | 'signup' | 'forgot-password') => void;
  onSubmit: (email: string, password?: string, isOver18?: boolean) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ mode, onClose, onSwitchMode, onSubmit }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isOver18, setIsOver18] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const isLogin = mode === 'login';
  const isForgot = mode === 'forgot-password';
  const isSignup = mode === 'signup';

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const validatePassword = (pass: string) => {
    if (pass.length < 8) return 'Access Key must be at least 8 characters.';
    if (!/[A-Z]/.test(pass)) return 'Security Warning: Include at least one uppercase letter.';
    if (!/[0-9]/.test(pass)) return 'Security Warning: Include at least one number.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isForgot) {
        if (!email) {
            setError('Email is required.');
            return;
        }
        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (response.ok) {
                setIsEmailSent(true);
            } else {
                setError(data.error || 'Failed to request reset.');
            }
        } catch (err) {
            setError('Connection failed. Try again.');
        }
        return;
    }

    if (!email || !password) {
        setError('Credentials required for Studio access.');
        return;
    }
    
    if (isSignup) {
        const passError = validatePassword(password);
        if (passError) {
            setError(passError);
            return;
        }
        if (password !== confirmPassword) {
            setError('Safety Check: Passwords do not match.');
            return;
        }
        if (!isOver18) {
            setError('Age Verification: You must be 18+ to use the Hub.');
            return;
        }

        // Show brief success before finalizing
        setIsSuccess(true);
        setTimeout(() => {
            onSubmit(email, password, isOver18);
        }, 1500);
    } else {
        onSubmit(email, password, isOver18);
    }
  };

  const handleInputChange = (setter: (val: string) => void, val: string) => {
      setter(val);
      if (error) setError('');
  };

  const title = isForgot ? 'Secure Reset' : (isLogin ? 'Maker Hub Access' : 'Create Maker Profile');
  const subtitle = isForgot ? 'Request an encrypted recovery link' : (isLogin ? 'Return to your active project hub' : 'Join a community of doers and makers');
  const buttonText = isForgot ? 'Request Reset Link' : (isLogin ? 'Enter Studio' : 'Initialize Profile');

  if (isEmailSent) {
    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center z-[100] p-4">
            <div className="bg-slate-800 rounded-[3rem] p-12 text-center max-w-md w-full animate-scale-in border border-slate-700">
                <div className="w-24 h-24 bg-emerald-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-emerald-500/20">
                    <SendIcon className="w-12 h-12 text-emerald-500" />
                </div>
                <h2 className="text-3xl font-black text-white mb-2 tracking-tighter">Transmission Sent</h2>
                <p className="text-slate-400 font-medium">Reset instructions are en route to {email}.</p>
                <button 
                  onClick={() => onSwitchMode('login')}
                  className="mt-8 text-xs font-black uppercase text-[#7D8FED] hover:text-white transition-colors tracking-widest"
                >
                    Return to Login
                </button>
            </div>
        </div>
    );
  }

  if (isSuccess) {
      return (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center z-[100] p-4">
              <div className="bg-slate-800 rounded-[3rem] p-12 text-center max-w-md w-full animate-scale-in border border-slate-700">
                  <div className="w-24 h-24 bg-emerald-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-emerald-500/20">
                      <CheckCircleIcon className="w-12 h-12 text-emerald-500" />
                  </div>
                  <h2 className="text-3xl font-black text-white mb-2 tracking-tighter">Profile Initialized</h2>
                  <p className="text-slate-400 font-medium">Welcome to the workshop, builder.</p>
              </div>
          </div>
      );
  }

  return (
    <div 
      className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center z-[150] p-4 sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-slate-800 rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] w-full max-w-md border border-slate-700/50 max-h-[92vh] flex flex-col overflow-hidden animate-scale-in">
        
        {/* Fixed Header */}
        <div className="p-8 pb-6 border-b border-slate-700/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="h-6 w-6 relative flex items-center justify-center">
                <img 
                  src={APP_CONFIG.LOGO_PATH} 
                  alt="L" 
                  className="h-full w-full object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                />
                <SparkleIcon className="h-5 w-5 text-[#7D8FED] hidden" />
             </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Security Portal</span>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 bg-slate-900 rounded-2xl text-slate-500 hover:text-white transition-all hover:scale-110 active:scale-90 border border-slate-700"
            aria-label="Close"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <div className="flex-grow overflow-y-auto custom-scrollbar p-8 sm:p-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2.5rem] bg-[#7D8FED]/10 mb-6 border border-[#7D8FED]/20 shadow-xl shadow-[#7D8FED]/5 overflow-hidden">
                <img 
                  src={APP_CONFIG.LOGO_PATH} 
                  alt="Logo" 
                  className="w-12 h-12 object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                />
                <SparkleIcon className="w-10 h-10 text-[#7D8FED] hidden" />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tighter">{title}</h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-3 leading-relaxed">{subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Account Email</label>
              <input
                type="email"
                placeholder="maker@studio.com"
                value={email}
                autoComplete="email"
                onChange={(e) => handleInputChange(setEmail, e.target.value)}
                className="w-full p-5 bg-slate-900 border border-slate-700 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:ring-4 focus:ring-[#7D8FED]/10 focus:border-[#7D8FED] transition-all"
                required
              />
            </div>

            {!isForgot && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Access Key</label>
                <div className="relative">
                  <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      autoComplete={isLogin ? "current-password" : "new-password"}
                      onChange={(e) => handleInputChange(setPassword, e.target.value)}
                      className="w-full p-5 bg-slate-900 border border-slate-700 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:ring-4 focus:ring-[#7D8FED]/10 focus:border-[#7D8FED] transition-all"
                      required
                  />
                  <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                      {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
                {isSignup && (
                    <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest ml-1">Requires 8+ chars, uppercase & number</p>
                )}
              </div>
            )}

            {isSignup && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Verify Key</label>
                  <div className="relative">
                    <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => handleInputChange(setConfirmPassword, e.target.value)}
                        className="w-full p-5 bg-slate-900 border border-slate-700 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:ring-4 focus:ring-[#7D8FED]/10 focus:border-[#7D8FED] transition-all"
                        required
                    />
                    <button 
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    >
                        {showConfirmPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div 
                    className="p-5 bg-slate-900/50 rounded-2xl border border-slate-700/50 flex items-center gap-4 group cursor-pointer" 
                    onClick={() => setIsOver18(!isOver18)}
                    title="You must be 18+ to access tools, equipment, and community features."
                >
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isOver18 ? 'bg-[#7D8FED] border-[#7D8FED]' : 'border-slate-700 group-hover:border-slate-500'}`}>
                    {isOver18 && <SparkleIcon className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div className="flex-grow">
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">18+ Safety Verification</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">I certify that I am of legal age to use tools & equipment.</p>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-center animate-fade-in">
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">{error}</p>
              </div>
            )}

            <div className="space-y-4">
                <button
                type="submit"
                className="w-full bg-[#7D8FED] text-white font-black py-6 px-4 rounded-2xl shadow-2xl shadow-[#7D8FED]/20 hover:bg-[#6b7ae6] hover:scale-[1.02] active:scale-95 transition-all duration-200 uppercase tracking-[0.2em] text-xs"
                >
                {buttonText}
                </button>
                {isLogin && (
                    <button 
                        type="button" 
                        onClick={() => onSwitchMode('forgot-password')}
                        className="w-full text-[9px] font-black uppercase text-slate-600 hover:text-slate-400 transition-colors tracking-widest"
                    >
                        Forgot Access Key?
                    </button>
                )}
            </div>
          </form>

          <div className="mt-8 text-center">
             <button 
                onClick={() => onSwitchMode(isLogin ? 'signup' : 'login')} 
                className="text-xs font-bold text-slate-500 hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto py-2"
              >
                {isForgot ? "Back to Login" : (isLogin ? "New Maker? Sign Up" : "Already a Member? Login")}
              </button>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-8 border-t border-slate-700/30 bg-slate-900/40">
           <button 
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all py-2"
           >
              <ArrowLeftIcon className="w-4 h-4" /> Cancel & Exit to Library
           </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
