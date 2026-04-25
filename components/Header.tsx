
import React, { useState, useEffect, useRef } from 'react';
import { SparkleIcon, UserIcon, ShoppingCartIcon, ShieldIcon, CookieIcon, MedalIcon, KeyIcon, CameraIcon, ChevronDownIcon, HeartIcon, RefreshCwIcon, TrophyIcon, BarChartIcon, DollarSignIcon, PackagePlusIcon } from './IconComponents';
import { User, UploadType } from '../types';
import { APP_CONFIG } from '../constants';

interface HeaderProps {
  onUploadClick: () => void;
  onAnalyzeClick: (initialTab?: UploadType) => void;
  onLoginClick: () => void;
  onSignupClick: () => void;
  onLogoutClick: () => void;
  onProfileClick: (tab?: string) => void;
  onHomeClick: () => void;
  onKitClick: () => void;
  onAdminClick: () => void;
  onDebugClick: () => void;
  onKeyClick: () => void;
  onUpgradeClick: () => void;
  currentUser: User | null;
  kitItemCount: number;
}

const Header: React.FC<HeaderProps> = ({ 
    onUploadClick, onAnalyzeClick, onLoginClick, onSignupClick, onLogoutClick, onProfileClick, onHomeClick, onKitClick, onAdminClick, onDebugClick, onKeyClick, onUpgradeClick,
    currentUser, kitItemCount 
}) => {
  const [avatarError, setAvatarError] = useState(false);
  const [shouldAnimateKit, setShouldAnimateKit] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (kitItemCount > 0) {
      setShouldAnimateKit(true);
      const timer = setTimeout(() => setShouldAnimateKit(false), 400);
      return () => clearTimeout(timer);
    }
  }, [kitItemCount]);

  useEffect(() => {
    setAvatarError(false);
  }, [currentUser?.email]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDropdownAction = (action: 'admin' | 'profile', tab?: string) => {
    setIsDropdownOpen(false);
    if (action === 'admin') onAdminClick();
    else onProfileClick(tab);
  };

  const isPartner = !!(currentUser?.isVerifiedPartner && !currentUser?.isAdmin);

  return (
    <header className="bg-slate-900/80 backdrop-blur-sm sticky top-0 z-[100] w-full border-b border-slate-700 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto flex items-center justify-between h-20">
        <button onClick={onHomeClick} className="flex items-center group flex-shrink-0">
          <div className="mr-2 sm:mr-3 h-8 w-8 sm:h-10 sm:w-10 relative flex items-center justify-center transition-transform group-hover:scale-110">
             <img 
               src={APP_CONFIG.LOGO_PATH} 
               alt="Watch1Do1" 
               className="h-full w-full object-contain"
               onError={(e) => {
                 e.currentTarget.style.display = 'none';
                 e.currentTarget.nextElementSibling?.classList.remove('hidden');
               }}
             />
             <SparkleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-[#7D8FED] hidden" />
          </div>
          <h1 className="text-lg sm:text-2xl font-black tracking-tighter text-white">
            Watch1Do1
          </h1>
          {APP_CONFIG.IS_BETA && (
            <span className="ml-2 px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[7px] font-black text-amber-500 uppercase tracking-widest translate-y-[1px]">
              {APP_CONFIG.BETA_LABEL}
            </span>
          )}
        </button>

        <div className="flex items-center gap-1.5 sm:gap-5">
           {currentUser?.isAdmin && (
             <div className="hidden lg:flex items-center gap-2 pr-5 border-r border-slate-800">
               <button onClick={onKeyClick} title="API Key Registry" className="p-2.5 text-slate-500 hover:text-amber-500 hover:bg-slate-800 rounded-xl transition-all">
                  <KeyIcon className="w-5 h-5" />
               </button>
               <button onClick={onDebugClick} title="Telemetry Debugger" className="p-2.5 text-slate-500 hover:text-[#7D8FED] hover:bg-slate-800 rounded-xl transition-all">
                  <CookieIcon className="w-5 h-5" />
               </button>
             </div>
           )}
          
           {currentUser ? (
            <div className="flex items-center gap-3">
              {currentUser.subscriptionStatus === 'Free' && (
                <button 
                  onClick={onUpgradeClick}
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500/20 rounded-full transition-all group"
                >
                  <TrophyIcon className="w-3.5 h-3.5 animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Upgrade to Pro</span>
                </button>
              )}
              <div className="relative" ref={dropdownRef}>
                <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`flex items-center gap-2 sm:gap-3 bg-slate-800/50 hover:bg-slate-800 px-1.5 py-1.5 sm:pr-5 rounded-full border transition-all group ${isDropdownOpen ? 'border-[#7D8FED] bg-slate-800' : 'border-slate-700/50'}`}
                >
                  <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full ${isPartner ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-700 border-slate-600'} border-2 overflow-hidden flex items-center justify-center`}>
                      {!avatarError && currentUser.avatarUrl ? (
                          <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" onError={() => setAvatarError(true)} />
                      ) : (
                          isPartner ? <ShieldIcon className="w-5 h-5 text-emerald-500" /> : <UserIcon className="w-5 h-5 text-slate-400" />
                      )}
                  </div>
                  <div className="hidden sm:block text-left">
                      <div className="flex items-center gap-2">
                        <span className="block text-xs font-black text-white leading-none">
                            {isPartner ? 'Merchant Console' : currentUser.displayName}
                        </span>
                        {currentUser.subscriptionStatus !== 'Free' && (
                            <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[7px] font-black uppercase rounded border border-emerald-500/20 tracking-widest">
                                {currentUser.subscriptionStatus}
                            </span>
                        )}
                        <ChevronDownIcon className={`w-3 h-3 text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                      {isPartner && <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest leading-none mt-1">Enterprise Hub</span>}
                      {!isPartner && currentUser.gamificationEnabled && <span className="text-[9px] font-black uppercase text-[#7D8FED] tracking-widest flex items-center gap-1.5 leading-none mt-1"><MedalIcon className="w-3 h-3" /> {currentUser.makerRank}</span>}
                  </div>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-slate-800 border border-slate-700 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-scale-in origin-top-right">
                    <div className="p-6 bg-slate-900/50 border-b border-slate-700/50">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{isPartner ? 'Corporate ID' : 'Authentic Maker'}</p>
                        <p className="text-sm font-black text-white truncate">{currentUser.email}</p>
                    </div>
                    <div className="p-3">
                        {isPartner ? (
                            <>
                                <button onClick={() => handleDropdownAction('admin')} className="w-full flex items-center gap-4 px-4 py-3 text-slate-400 hover:text-white hover:bg-emerald-500/10 rounded-xl transition-all">
                                    <BarChartIcon className="w-4 h-4 text-emerald-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Business Intelligence</span>
                                </button>
                                <button onClick={() => handleDropdownAction('admin')} className="w-full flex items-center gap-4 px-4 py-3 text-slate-400 hover:text-white hover:bg-emerald-500/10 rounded-xl transition-all">
                                    <PackagePlusIcon className="w-4 h-4 text-emerald-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Inventory Catalog</span>
                                </button>
                                <button onClick={() => handleDropdownAction('profile', 'overview')} className="w-full flex items-center gap-4 px-4 py-3 text-slate-400 hover:text-white hover:bg-emerald-500/10 rounded-xl transition-all">
                                    <DollarSignIcon className="w-4 h-4 text-emerald-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Settlement Gateway</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => handleDropdownAction('profile', 'overview')} className="w-full flex items-center gap-4 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all">
                                    <UserIcon className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Profile Wallet</span>
                                </button>
                                {currentUser.isAdmin && (
                                    <button onClick={() => handleDropdownAction('admin')} className="w-full flex items-center gap-4 px-4 py-3 text-rose-500 hover:text-white hover:bg-rose-500/10 rounded-xl transition-all">
                                        <ShieldIcon className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Admin Terminal</span>
                                    </button>
                                )}
                                <button onClick={() => handleDropdownAction('profile', 'showcase')} className="w-full flex items-center gap-4 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all">
                                    <TrophyIcon className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Mastery Showcase</span>
                                </button>
                                <button onClick={() => handleDropdownAction('profile', 'studio')} className="w-full flex items-center gap-4 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all">
                                    <RefreshCwIcon className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">My Teach Ones</span>
                                </button>
                                <button onClick={() => { setIsDropdownOpen(false); onUpgradeClick(); }} className="w-full flex items-center gap-4 px-4 py-3 text-amber-500 hover:text-white hover:bg-amber-500/10 rounded-xl transition-all">
                                    <TrophyIcon className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Subscription Hub</span>
                                </button>
                            </>
                        )}
                    </div>
                    <div className="p-3 bg-slate-900/30 border-t border-slate-700/50">
                        <button onClick={() => { setIsDropdownOpen(false); onLogoutClick(); }} className="w-full flex items-center gap-4 px-4 py-3 text-rose-500 hover:text-rose-400 hover:bg-rose-500/5 rounded-xl transition-all">
                            <ShieldIcon className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Sign Out</span>
                        </button>
                    </div>
                </div>
              )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-4">
              <button onClick={onLoginClick} className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white whitespace-nowrap">Sign In</button>
              <button onClick={onSignupClick} className="px-3 sm:px-6 py-2 sm:py-2.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-900 bg-white rounded-lg sm:rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all whitespace-nowrap">Join Hub</button>
            </div>
          )}
          
          <div className="h-8 w-px bg-slate-800 hidden md:block"></div>

          <div className="hidden sm:flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => onAnalyzeClick(UploadType.YOUTUBE)}
              className="flex items-center gap-2 px-2.5 sm:px-5 py-2.5 sm:py-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[#7D8FED] bg-[#7D8FED]/10 border border-[#7D8FED]/20 rounded-lg sm:rounded-xl hover:bg-[#7D8FED]/20 transition-all"
            >
              <CameraIcon className="w-3.5 h-3.5 sm:w-4 h-4" />
              <span className="hidden xl:block">{isPartner ? 'Inventory Scan' : 'AI Vision'}</span>
            </button>

            <button
              onClick={onUploadClick}
              className="flex items-center gap-2 px-3 sm:px-6 py-2.5 sm:py-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white bg-[#7D8FED] rounded-lg sm:rounded-xl shadow-lg hover:bg-[#6b7ae6] hover:scale-105 active:scale-95 transition-all"
            >
              <SparkleIcon className="w-3.5 h-3.5 sm:w-4 h-4" />
              <span className="hidden sm:block">{isPartner ? 'Publish Hub' : 'Teach One'}</span>
            </button>
          </div>
          
          <button onClick={onKitClick} className="relative p-2 sm:p-2.5 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-lg sm:rounded-xl transition-all">
              <ShoppingCartIcon className="w-5 h-5 sm:w-6 h-6" />
              {kitItemCount > 0 && <span className={`absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 text-[10px] font-black text-white bg-[#7D8FED] rounded-full border-2 border-slate-900 ${shouldAnimateKit ? 'animate-bounce-scale' : ''}`}>{kitItemCount}</span>}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
