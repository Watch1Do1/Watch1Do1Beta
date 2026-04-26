
import React from 'react';
import { Video, User } from '../types';
import { SparkleIcon, UserIcon, ShieldIcon } from './IconComponents';

interface VideoCardProps {
  video: Video;
  onSelect: (video: Video) => void;
  isProfileView?: boolean;
  currentUser?: User | null;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onSelect, isProfileView = false, currentUser }) => {
  const avgRating = video.rating || 0;
  const isTopBuild = avgRating >= 4.5 && (video.ratingCount || 0) > 5;
  const gamificationEnabled = currentUser?.gamificationEnabled ?? true;

  return (
    <div 
      className="group cursor-pointer rounded-[2rem] overflow-hidden bg-slate-800 border border-slate-700/50 shadow-xl hover:shadow-[#7D8FED]/10 transition-all duration-500 transform hover:-translate-y-2"
      onClick={() => onSelect(video)}
    >
      <div className="relative aspect-video overflow-hidden">
        <img 
          src={video.thumbnailUrl} 
          alt={video.title} 
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1" 
        />
        
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity"></div>
        
        {/* Status Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
            {isTopBuild && gamificationEnabled && (
                <div className="bg-[#7D8FED] text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xl animate-pulse">
                    <SparkleIcon className="w-3 h-3" /> Master Build
                </div>
            )}
            {!gamificationEnabled && isTopBuild && (
                 <div className="bg-slate-900/90 backdrop-blur-md text-emerald-400 text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-emerald-500/20">
                    <ShieldIcon className="w-3 h-3" /> Top Rated
                </div>
            )}
            <div className="flex gap-1.5">
                <span className="bg-slate-950/60 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border border-white/10">
                    {video.insights.difficulty}
                </span>
                <span className="bg-slate-950/60 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border border-white/10">
                    {video.insights.timeEstimate}
                </span>
            </div>
        </div>

        {isProfileView && video.status !== 'published' && (
            <div className="absolute top-4 right-4 bg-amber-500 text-slate-900 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-2xl border border-amber-400/50">
                {video.status === 'pending_review' ? 'In Review' : 'Draft'}
            </div>
        )}

        {/* Category Pill */}
        <span className="absolute bottom-4 right-4 text-[7px] font-black uppercase tracking-widest text-slate-400 bg-slate-950/70 px-2 py-0.5 rounded border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
          {video.category}
        </span>
        
        {/* Title and Active Builders */}
        <div className="absolute bottom-4 left-5 right-5">
          <h3 className="text-lg font-black text-white leading-tight line-clamp-2 tracking-tight mb-2 group-hover:text-[#7D8FED] transition-colors">
            {video.title}
          </h3>
          <div className="flex items-center gap-2">
             <div className="flex -space-x-2">
                {[1,2,3].map(i => (
                    <div key={i} className="w-5 h-5 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center">
                        <UserIcon className="w-2.5 h-2.5 text-slate-400" />
                    </div>
                ))}
             </div>
             <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                {gamificationEnabled 
                  ? `${video.activeBuilders}+ Builders Active` 
                  : `${video.activeBuilders || 0} Views / Interactions`}
             </span>
          </div>
        </div>
      </div>
      
      <div className="p-5 flex items-center justify-between bg-slate-800/50">
        <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center overflow-hidden">
                <UserIcon className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="flex flex-col min-w-0">
                <span className="text-[6px] text-slate-500 font-black uppercase tracking-widest leading-none mb-0.5">Curated by</span>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest truncate max-w-[100px]">
                    {video.creatorHandle ? `@${video.creatorHandle}` : video.creatorDisplayName || video.creator}
                </p>
            </div>
        </div>
        
        <div 
          className="flex items-center gap-1.5 bg-slate-900/50 px-3 py-1 rounded-full border border-slate-700"
          role="img"
          aria-label={`Rating: ${avgRating > 0 ? avgRating.toFixed(1) : 'New'} out of 5`}
        >
            {gamificationEnabled && <SparkleIcon className={`w-3 h-3 ${avgRating > 0 ? 'text-amber-400' : 'text-slate-600'}`} />}
            {!gamificationEnabled && <UserIcon className="w-3 h-3 text-slate-500" />}
            <span className="text-[10px] font-black text-white">
                {avgRating > 0 ? avgRating.toFixed(1) : 'NEW'}
            </span>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
