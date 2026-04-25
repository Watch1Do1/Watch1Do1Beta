
import React from 'react';
import { HeartIcon } from './IconComponents';
import { APP_CONFIG } from '../constants';

interface FooterProps {
  onNavigate: (view: any) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 py-16 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl font-black text-white tracking-tighter">Watch1Do1</span>
          </div>
          <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
            Empowering makers with AI-assisted shopping and expert insights. 
            Build your dream projects with confidence using multi-modal intelligence.
          </p>
        </div>
        <div>
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Explore</h4>
          <ul className="space-y-3">
            <li><button onClick={() => onNavigate('about')} role="link" className="text-sm text-slate-400 hover:text-[#7D8FED] transition-colors">About Us</button></li>
            <li><button onClick={() => onNavigate('contact')} role="link" className="text-sm text-slate-400 hover:text-[#7D8FED] transition-colors">Contact</button></li>
            <li><button onClick={() => onNavigate('affiliateGuide')} role="link" className="text-sm text-slate-400 hover:text-[#7D8FED] transition-colors">Affiliate Guide</button></li>
            <li><button onClick={() => onNavigate('disclosure')} role="link" className="text-sm text-slate-400 hover:text-[#7D8FED] transition-colors">Affiliate Disclosure</button></li>
            <li><button onClick={() => onNavigate('terms')} role="link" className="text-sm text-slate-400 hover:text-[#7D8FED] transition-colors">Terms of Service</button></li>
            <li><button onClick={() => onNavigate('privacy')} role="link" className="text-sm text-slate-400 hover:text-[#7D8FED] transition-colors">Privacy Policy</button></li>
          </ul>
        </div>
        <div className="col-span-1">
          <div className="bg-slate-800/40 rounded-3xl p-6 border border-slate-700/50 flex flex-col justify-between hover:border-rose-500/20 transition-all duration-500 group relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 -m-4 w-24 h-24 bg-rose-500/5 blur-3xl rounded-full group-hover:bg-rose-500/10 transition-colors duration-500" />
            <div className="relative z-10">
              <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                Mission Support <HeartIcon className="w-3 h-3 text-rose-500" isFilled={true} />
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal mb-6">
                Watch1Do1 is built by makers, for makers. Your contributions help us maintain the AI and keep this platform free for the community.
              </p>
            </div>
            <button 
              onClick={() => onNavigate('support')}
              className="relative z-10 w-full bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 hover:border-rose-500 text-rose-500 hover:text-white text-[11px] font-bold py-3.5 px-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2.5 active:scale-[0.98]"
            >
              Support Our Mission
              <HeartIcon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" isFilled={true} />
            </button>
          </div>
        </div>
      </div>
      <div className="container mx-auto mt-16 pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-[10px] text-slate-600 font-bold flex items-center justify-center gap-1.5 uppercase tracking-widest">
          <span>© {new Date().getFullYear()} Watch1Do1. Built with</span>
          <HeartIcon className="w-3.5 h-3.5 text-rose-500" isFilled={true} />
          <span>for the Maker Community.</span>
        </div>
        <div className="text-[9px] text-slate-700 font-black uppercase tracking-[0.3em]">
          v{APP_CONFIG.VERSION}{APP_CONFIG.IS_BETA ? `-${APP_CONFIG.BETA_LABEL.split(' ')[0]}` : ''}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
