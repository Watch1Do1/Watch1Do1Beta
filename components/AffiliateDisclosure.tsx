
import React from 'react';
import { ArrowLeftIcon, DollarSignIcon, SparkleIcon, ShieldIcon } from './IconComponents';

interface AffiliateDisclosureProps {
  onBack: () => void;
}

const AffiliateDisclosure: React.FC<AffiliateDisclosureProps> = ({ onBack }) => {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 mb-10 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all group">
        <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
        Back to Workshop
      </button>

      <div className="bg-slate-800 rounded-[2.5rem] p-10 md:p-14 border border-slate-700/50 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <DollarSignIcon className="w-48 h-48 text-white" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-5 mb-12">
            <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
              <DollarSignIcon className="w-8 h-8 text-amber-500" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter">Affiliate Disclosure</h1>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Transparency in the Maker Economy</p>
            </div>
          </div>

          <div className="space-y-8 text-slate-400 text-sm leading-relaxed">
            <div className="bg-slate-900/50 p-8 rounded-3xl border border-amber-500/10 mb-8">
                <p className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ShieldIcon className="w-4 h-4 text-amber-500" /> Mandatory Network Disclosure
                </p>
                <div className="space-y-4">
                  <p className="text-lg font-bold text-slate-200 leading-relaxed italic">
                      Watch1Do1 participates in the eBay Partner Network (EPN), an affiliate advertising program designed to provide a means for sites to earn advertising fees by advertising and linking to eBay.com and related properties.
                  </p>
                  <p className="text-sm border-l-2 border-amber-500 pl-4 py-1">
                    As an eBay Partner, Watch1Do1 may be compensated if you make a purchase through qualifying links. This compensation helps support platform operations, including AI-assisted project analysis, at no additional cost to you.
                  </p>
                </div>
            </div>

            <section>
              <h2 className="text-white font-black text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> How Affiliate Links Work
              </h2>
              <p className="mb-4">
                When you click a “Buy” or outbound link in a Planning Kit, Watch1Do1 may include affiliate tracking parameters if the destination retailer participates in an affiliate program.
              </p>
              <ul className="space-y-2 pl-4 list-disc text-xs mb-4">
                <li>Purchases are completed on third-party sites</li>
                <li>Pricing, availability, shipping, and returns are governed solely by the retailer</li>
                <li>Watch1Do1 does not process payments or fulfill orders</li>
              </ul>
              <p>Affiliate compensation may be shared with the original creator only when they have declared responsibility for the item used in the build.</p>
            </section>

            <section>
              <h2 className="text-white font-black text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> Partner Selection & Platform Neutrality
              </h2>
              <p className="mb-4">
                Watch1Do1 currently supports sourcing through partners such as eBay due to their broad inventory, including specialized tools and hard-to-find materials. However:
              </p>
              <ul className="space-y-2 pl-4 list-disc text-xs mb-4">
                <li>Retailers are not prioritized based on commission</li>
                <li>Affiliate relationships do not influence item eligibility</li>
                <li>No inferior or unnecessary product will be suggested to increase revenue</li>
              </ul>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                Retailer availability may change over time as new partners are added.
              </p>
            </section>

            <section>
              <h2 className="text-white font-black text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> The Role of AI in Recommendations
              </h2>
              <p className="mb-4">
                AI tools on Watch1Do1 assist with identifying tools and materials commonly required for a project. 
              </p>
              <p className="mb-4">
                AI does not endorse, rank, or monetize products independently. All authoritative item placement and affiliate attribution requires human review and creator accountability.
              </p>
            </section>

            <div className="p-8 bg-slate-900 rounded-[2rem] border border-slate-700">
               <div className="flex items-center gap-3 mb-6">
                 <SparkleIcon className="w-5 h-5 text-[#7D8FED]" />
                 <h3 className="text-white font-black text-[10px] uppercase tracking-widest">Our Commitment</h3>
               </div>
               <ul className="space-y-3 text-xs md:grid md:grid-cols-2 gap-x-8 md:space-y-0">
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-[#7D8FED] rounded-full" />
                    <span>We optimize for build success, not clicks.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-[#7D8FED] rounded-full" />
                    <span>We never substitute correctness for commission.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-[#7D8FED] rounded-full" />
                    <span>Creators earn only where they are accountable.</span>
                  </li>
                  <li className="flex items-center gap-2 underline underline-offset-4 decoration-[#7D8FED]/40">
                    <div className="w-1 h-1 bg-[#7D8FED] rounded-full" />
                    <span className="font-black text-white uppercase tracking-tighter">We are makers first, assistants second.</span>
                  </li>
               </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AffiliateDisclosure;
