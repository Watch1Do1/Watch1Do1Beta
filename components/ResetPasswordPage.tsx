
import React, { useState, useEffect } from 'react';
import { SparkleIcon, ShieldIcon, EyeIcon, EyeOffIcon, CheckCircleIcon, ArrowLeftIcon } from './IconComponents';

interface ResetPasswordPageProps {
    onBack: () => void;
}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onBack }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const queryParams = new URLSearchParams(window.location.search);
    const token = queryParams.get('token');
    const email = queryParams.get('email');

    useEffect(() => {
        if (!token || !email) {
            setStatus('error');
            setErrorMessage('Invalid recovery link. Please request a new one.');
        }
    }, [token, email]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setErrorMessage('Passwords do not match.');
            return;
        }
        if (password.length < 8) {
            setErrorMessage('Password must be at least 8 characters.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, token, newPassword: password })
            });
            const data = await response.json();
            if (response.ok) {
                setStatus('success');
            } else {
                setStatus('error');
                setErrorMessage(data.error || 'Failed to reset password.');
            }
        } catch (err) {
            setStatus('error');
            setErrorMessage('Connection failed.');
        } finally {
            setIsLoading(false);
        }
    };

    if (status === 'success') {
        return (
            <div className="container mx-auto px-4 py-24 text-center animate-fade-in max-w-md">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-emerald-500/10 mb-8 border border-emerald-500/20 shadow-xl shadow-emerald-500/10">
                    <CheckCircleIcon className="w-10 h-10 text-emerald-500" />
                </div>
                <h1 className="text-4xl font-black text-white tracking-tighter mb-4">Sync Complete</h1>
                <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px] mb-8 max-w-sm mx-auto leading-relaxed">
                  Your access key has been successfully updated. You can now return to the workshop.
                </p>
                <button 
                  onClick={onBack} 
                  className="w-full py-5 bg-[#7D8FED] text-white font-black rounded-2xl hover:bg-[#6b7ae6] hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-xs"
                >
                    Return to Login
                </button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12 max-w-md animate-fade-in">
            <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2.5rem] bg-[#7D8FED]/10 mb-6 border border-[#7D8FED]/20 shadow-xl shadow-[#7D8FED]/5">
                    <ShieldIcon className="w-10 h-10 text-[#7D8FED]" />
                </div>
                <h1 className="text-4xl font-black text-white tracking-tighter">Security Sync</h1>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-3">Finalizing access key recovery</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-slate-800 rounded-[2.5rem] p-10 border border-slate-700/50 shadow-2xl space-y-8">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">New Access Key</label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
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
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirm Key</label>
                    <input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full p-5 bg-slate-900 border border-slate-700 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:ring-4 focus:ring-[#7D8FED]/10 focus:border-[#7D8FED] transition-all"
                        required
                    />
                </div>

                {errorMessage && (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-center">
                        <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">{errorMessage}</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#7D8FED] text-white font-black py-6 rounded-2xl hover:bg-[#6b7ae6] hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-[0.2em] text-xs disabled:opacity-50"
                >
                    {isLoading ? 'Synchronizing...' : 'Update Access Key'}
                </button>
            </form>
            
            <button 
                onClick={onBack}
                className="w-full mt-10 text-[10px] font-black uppercase text-slate-600 hover:text-slate-400 transition-colors tracking-[0.3em]"
            >
                Cancel & Return
            </button>
        </div>
    );
};

export default ResetPasswordPage;
