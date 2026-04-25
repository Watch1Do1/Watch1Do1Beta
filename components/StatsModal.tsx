import React from 'react';
import { Video } from '../types';
import { CloseIcon, SparkleIcon, EyeIcon, MousePointerClickIcon, DollarSignIcon } from './IconComponents';

interface StatsModalProps {
  video: Video;
  onClose: () => void;
}

const StatItem: React.FC<{ icon: React.ReactNode; label: string; value: string | number }> = ({ icon, label, value }) => (
    <div className="bg-slate-700/50 p-4 rounded-lg flex items-center gap-4">
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-slate-600 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm text-slate-400">{label}</p>
            <p className="text-xl font-bold text-white">{value}</p>
        </div>
    </div>
);


const StatsModal: React.FC<StatsModalProps> = ({ video, onClose }) => {
  const stats = video.stats || { views: 0, clicks: 0, sales: 0, tips: 0 };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700 transform transition-all duration-300 scale-95 animate-scale-in">
        <div className="relative p-8">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
            <CloseIcon className="w-6 h-6" />
          </button>
          
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-1">Video Performance</h2>
            <p className="text-sm text-slate-400 truncate max-w-full">{video.title}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <StatItem 
                icon={<EyeIcon className="w-5 h-5 text-[#7D8FED]"/>}
                label="Views"
                value={stats.views.toLocaleString()}
            />
            <StatItem 
                icon={<MousePointerClickIcon className="w-5 h-5 text-[#7D8FED]"/>}
                label="Product Clicks"
                value={stats.clicks.toLocaleString()}
            />
            <StatItem 
                icon={<DollarSignIcon className="w-5 h-5 text-[#7D8FED]"/>}
                label="Sales Generated"
                value={`$${(stats.sales * 49.99).toLocaleString()}`} // Example calculation
            />
             <StatItem 
                icon={<SparkleIcon className="w-5 h-5 text-[#7D8FED]"/>}
                label="Tips Received"
                value={stats.tips.toLocaleString()}
            />
          </div>

          <p className="text-xs text-slate-500 text-center mt-6">Stats are updated periodically. Sales are an estimate.</p>

        </div>
      </div>
       <style>{`
        @keyframes scale-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in { animation: scale-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default StatsModal;