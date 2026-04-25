
import React, { useState } from 'react';
import { CloseIcon, CopyIcon, CheckCircleIcon, SparkleIcon, TrophyIcon, YouTubeIcon } from './IconComponents';
import { Video } from '../types';

interface ShareModalProps {
  video: Video;
  onClose: () => void;
  isCreatorView?: boolean;
}

const ShareModal: React.FC<ShareModalProps> = ({ video, onClose, isCreatorView = false }) => {
  const [isCopied, setIsCopied] = useState(false);
  
  const shareUrl = `https://watch1do1.com/hub/${video.id}`;
  const shareText = isCreatorView 
    ? `Just published a new project on @Watch1Do1: ${video.title}! Full AI kit included 🔥 ${shareUrl} #MakerCommunity`
    : `I just built this killer project from Watch1Do1: ${video.title} 📸 Check it out ${shareUrl} #Watch1Do1 #MakerLife`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleXShare = () => {
      const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
      window.open(url, '_blank');
  };

  const handleNativeShare = async () => {
      if (navigator.share) {
          try {
              await navigator.share({ title: video.title, text: shareText, url: shareUrl });
          } catch (e) { console.log("Share cancelled"); }
      } else {
          handleCopy();
      }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-[3rem] p-10 max-w-md w-full shadow-2xl animate-scale-in relative">
        <button onClick={onClose} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-all hover:rotate-90">
          <CloseIcon className="w-6 h-6" />
        </button>

        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-[#7D8FED]/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-[#7D8FED]/20 shadow-xl">
             {isCreatorView ? <SparkleIcon className="w-10 h-10 text-[#7D8FED]" /> : <TrophyIcon className="w-10 h-10 text-amber-500" />}
          </div>
          <h2 className="text-3xl font-black text-white tracking-tighter mb-2">
              {isCreatorView ? 'Promote Your Hub' : 'Share Your Mastery'}
          </h2>
          <p className="text-slate-400 text-sm font-medium">Inspire the community and earn visibility XP.</p>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 mb-8 relative">
            <p className="text-xs text-white leading-relaxed font-bold italic line-clamp-3">"{shareText}"</p>
            <div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-3">
                <img src={video.thumbnailUrl} className="w-12 h-12 rounded-lg object-cover" alt="" />
                <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">{video.title}</p>
                    <p className="text-[9px] font-bold text-[#7D8FED] truncate">{shareUrl}</p>
                </div>
            </div>
        </div>

        <div className="space-y-4">
            <button 
                onClick={handleXShare}
                className="w-full py-5 bg-[#1DA1F2] text-white font-black rounded-2xl flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-xs hover:scale-[1.02] transition-all shadow-xl shadow-[#1DA1F2]/10"
            >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                Post to X
            </button>
            
            <div className="grid grid-cols-2 gap-4">
                <button 
                    onClick={handleCopy}
                    className={`py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all flex items-center justify-center gap-2 border ${isCopied ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-600'}`}
                >
                    {isCopied ? <CheckCircleIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                    {isCopied ? 'Copied' : 'Copy link'}
                </button>
                <button 
                    onClick={handleNativeShare}
                    className="py-5 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6L15.316 7.684m1.747 10.256a3 3 0 115.143-2.14c0 .482-.114.938-.316 1.342m-1.511 1.798a3 3 0 11-5.143-2.14c0-.482.114-.938.316-1.342m1.511-1.798l-6.632-3.316m6.632 6l-6.632-3.316" /></svg>
                    More
                </button>
            </div>
        </div>
        
        <p className="text-[8px] text-center text-slate-600 font-bold uppercase tracking-widest mt-8">
            Each click on your link directly supports the Watch1Do1 ecosystem.
        </p>
      </div>
    </div>
  );
};

export default ShareModal;
