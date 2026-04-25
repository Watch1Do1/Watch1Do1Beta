
import React from 'react';
import { SparkleIcon, ShieldIcon, SearchIcon } from './IconComponents';

const AboutUs: React.FC<{onBack: () => void}> = ({ onBack }) => {
  return (
    <div className="container mx-auto px-4 py-20 animate-fade-in max-w-4xl">
      <button onClick={onBack} className="mb-12 text-[#7D8FED] font-black uppercase text-xs tracking-widest">← Back</button>
      
      <div className="space-y-12">
        <header className="text-center space-y-4">
          <SparkleIcon className="w-16 h-16 text-[#7D8FED] mx-auto mb-6" />
          <h1 className="text-6xl font-black text-white tracking-tighter">The Watch1Do1 Mission</h1>
          <p className="text-xl text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto">
            We are bridging the gap between watching a tutorial and actually building it. Our AI extracts precision data so you can focus on the craft, not the checkout.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-800 p-8 rounded-[2rem] border border-slate-700">
            <SearchIcon className="w-10 h-10 text-[#7D8FED] mb-6" />
            <h3 className="text-xl font-black text-white mb-4">Visual Logic</h3>
            <p className="text-sm text-slate-400 leading-relaxed">Our multimodal AI analyzes project frames to identify the exact tools and brands used, ensuring you buy the right fit the first time.</p>
          </div>
          <div className="bg-slate-800 p-8 rounded-[2rem] border border-slate-700">
            <ShieldIcon className="w-10 h-10 text-red-500 mb-6" />
            <h3 className="text-xl font-black text-white mb-4">Halsted Safety</h3>
            <p className="text-sm text-slate-400 leading-relaxed">We run automated safety sweeps on project steps to identify required gear and highlight potential hazards for beginners.</p>
          </div>
          <div className="bg-slate-800 p-8 rounded-[2rem] border border-slate-700">
            <SparkleIcon className="w-10 h-10 text-amber-500 mb-6" />
            <h3 className="text-xl font-black text-white mb-4">Maker Economy</h3>
            <p className="text-sm text-slate-400 leading-relaxed">By kitting projects through affiliate networks, we help creators monetize their knowledge while saving makers time.</p>
          </div>
        </div>

        <section className="bg-[#7D8FED]/5 border border-[#7D8FED]/20 p-12 rounded-[3rem] text-center">
            <h2 className="text-3xl font-black text-white mb-6">Built for the Global Maker Community</h2>
            <p className="text-slate-400 leading-relaxed mb-8 max-w-xl mx-auto">
                Watch1Do1 started as a simple checklist tool and has evolved into a high-performance AI assistant for carpenters, engineers, artists, and DIY enthusiasts.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
                <div className="bg-slate-800 px-6 py-3 rounded-full border border-slate-700 text-xs font-black uppercase tracking-widest text-slate-300">1.2M+ Projects Analyzed</div>
                <div className="bg-slate-800 px-6 py-3 rounded-full border border-slate-700 text-xs font-black uppercase tracking-widest text-slate-300">45k+ Verified Toolkits</div>
                <div className="bg-slate-800 px-6 py-3 rounded-full border border-slate-700 text-xs font-black uppercase tracking-widest text-slate-300">Zero Build Failures</div>
            </div>
        </section>
      </div>
    </div>
  );
};

export default AboutUs;
