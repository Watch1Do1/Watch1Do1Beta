
import React from 'react';
import { ArrowLeftIcon, ShieldIcon, SparkleIcon, DollarSignIcon } from './IconComponents';

interface TermsOfServiceProps {
  onBack: () => void;
}

const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 mb-10 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all group">
        <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
        Back to Workshop
      </button>

      <div className="bg-slate-800 rounded-[2.5rem] p-10 md:p-14 border border-slate-700/50 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <ShieldIcon className="w-48 h-48 text-white" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-5 mb-12">
            <div className="p-4 bg-[#7D8FED]/10 rounded-2xl border border-[#7D8FED]/20">
              <ShieldIcon className="w-8 h-8 text-[#7D8FED]" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter">Terms of Service</h1>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Version 5.0 • Effective Jan 2025</p>
            </div>
          </div>

          <div className="space-y-10 text-slate-400 text-sm leading-relaxed">
            <section>
              <h2 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#7D8FED] rounded-full" /> 1. Acceptance of Terms
              </h2>
              <p>
                By accessing or using Watch1Do1 (“the Platform”), you agree to be bound by these Terms of Service (“Terms”). If you do not agree, you may not use the Platform. For questions related to these Terms, contact: team@watch1do1.com
              </p>
            </section>

            <section>
              <h2 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#7D8FED] rounded-full" /> 2. Description of the Service
              </h2>
              <p>
                Watch1Do1 helps users prepare and complete real-world projects by transforming instructional content into structured Planning Kits. The Platform may include AI-assisted analysis, creator-generated content, community refinement, and monetization tools.
              </p>
            </section>

            <section>
              <h2 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#7D8FED] rounded-full" /> 3. eBay Partner Network Participation
              </h2>
              <p className="mb-4">
                Watch1Do1 is a participant in the eBay Partner Network (EPN), an affiliate advertising program designed to provide a means for sites to earn advertising fees by linking to eBay.com and related properties.
              </p>
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700 flex flex-col gap-4 mb-4">
                <div className="flex items-start gap-4">
                  <DollarSignIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-1" />
                  <p className="text-[11px] font-bold text-slate-500 italic uppercase tracking-tight">
                    Mandatory Disclosure: "As an eBay Partner, Watch1Do1 may be compensated if you make a purchase." Any compensation received helps fund AI project analysis and platform operations at no additional cost to you.
                  </p>
                </div>
              </div>
              <p className="text-xs font-bold text-white mb-2">When clicking an eBay link:</p>
              <ul className="space-y-2 pl-4 list-disc text-xs">
                <li>You are redirected to eBay or an eBay-owned service</li>
                <li>Purchases are governed solely by eBay’s terms and policies</li>
                <li>Watch1Do1 does not process payments, set prices, ship products, or guarantee availability</li>
              </ul>
            </section>

            <section>
              <h2 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#7D8FED] rounded-full" /> 4. User Accounts
              </h2>
              <p>
                Users are responsible for all activity conducted through their account. You agree to provide accurate information and confirm that you are at least 18 years old.
              </p>
            </section>

            <section>
              <h2 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#7D8FED] rounded-full" /> 5. Creator Content & Ownership
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-white text-[10px] font-black uppercase tracking-widest mb-2">5.1 Creator Ownership</h3>
                  <p>Creators retain full ownership of any content they upload, including videos, images, text, and associated materials (“Creator Content”).</p>
                </div>
                <div>
                  <h3 className="text-white text-[10px] font-black uppercase tracking-widest mb-2">5.2 Platform License</h3>
                  <p>By uploading Creator Content, creators grant Watch1Do1 a non-exclusive, worldwide, royalty-free license to host, analyze, display, distribute, and adapt such content solely for the purpose of operating and improving the Platform. This license terminates upon deletion, subject to standard caching, backups, and compliance records.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#7D8FED] rounded-full" /> 6. AI Vision Inferences & Human Responsibility
              </h2>
              <p className="mb-4">
                Product lists, cost estimates, safety recommendations, and Planning Kit components may be generated using multimodal large language models and are inferential in nature. These outputs are provided for convenience only.
              </p>
              <p className="text-xs font-bold text-white mb-2">Creators and users are responsible for verifying:</p>
              <ul className="space-y-2 pl-4 list-disc text-xs mb-6">
                <li>Tool and material compatibility</li>
                <li>Safety procedures</li>
                <li>Local building codes</li>
                <li>Project suitability</li>
              </ul>
              <div className="bg-[#7D8FED]/5 p-6 rounded-2xl border border-[#7D8FED]/10">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed text-center">
                  <SparkleIcon className="w-3 h-3 inline mr-1 text-[#7D8FED]" />
                  Building responsibly is a core tenet of the Watch1Do1 community.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#7D8FED] rounded-full" /> 7. Planning Kits & Authority Declaration
              </h2>
              <p className="mb-4">Certain subscription tiers allow creators to declare specific tools or materials as “Canonical” for a build.</p>
              <ul className="space-y-2 pl-4 list-disc text-xs">
                <li>Canonical declarations reflect the creator’s judgment and experience</li>
                <li>They do not constitute platform endorsement</li>
                <li>Declaration authority may be limited, reviewed, revoked, or suspended</li>
              </ul>
            </section>

            <section>
              <h2 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#7D8FED] rounded-full" /> 8. Monetization & Affiliate Attribution
              </h2>
              <p className="mb-4">Some links on the Platform may be affiliate links. Where applicable:</p>
              <ul className="space-y-2 pl-4 list-disc text-xs mb-4">
                <li>Affiliate links are disclosed and labeled</li>
                <li>Monetization is permitted only for declared canonical items</li>
                <li>Affiliate attribution may be modified or revoked by the creator who owns the link</li>
              </ul>
              <p>Watch1Do1 reserves the right to restrict monetization features to preserve trust, accuracy, and compliance.</p>
            </section>

            <section>
              <h2 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#7D8FED] rounded-full" /> 9. Tiered Maker Subscriptions
              </h2>
              <p className="mb-4">By subscribing to Maker tiers, you agree to the following billing terms:</p>
              <ul className="space-y-3 pl-4 mb-4 list-disc text-xs">
                <li><strong>Monthly ($5.99):</strong> Billed every 30 days.</li>
                <li><strong>Semi-Annual ($29.99):</strong> Billed every 6 months (non-refundable once active).</li>
                <li><strong>Annual ($49.99):</strong> Billed every 12 months (non-refundable once active).</li>
              </ul>
              <p>Subscriptions may be canceled at any time through Profile Hub settings. Access remains active through the current billing cycle.</p>
            </section>

            <section>
              <h2 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#7D8FED] rounded-full" /> 10. Deletion, Suspension & Termination
              </h2>
              <p>
                Creators may delete their content at any time. Watch1Do1 may retain anonymized analytics, compliance logs, and aggregated usage data. The Platform reserves the right to suspend accounts or restrict features for violations of these Terms or misuse of monetization privileges.
              </p>
            </section>

            <section>
              <h2 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#7D8FED] rounded-full" /> 11. Third-Party Services
              </h2>
              <p>
                The Platform may link to or integrate with third-party services. Watch1Do1 is not responsible for third-party products, services, or transactions.
              </p>
            </section>

            <section>
              <h2 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#7D8FED] rounded-full" /> 12. Disclaimers
              </h2>
              <p>
                The Platform is provided “as-is” and “as available.” Watch1Do1 makes no guarantees regarding project outcomes, safety, or completion.
              </p>
            </section>

            <section>
              <h2 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#7D8FED] rounded-full" /> 13. Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted by law, Watch1Do1 shall not be liable for indirect, incidental, or consequential damages arising from use of the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#7D8FED] rounded-full" /> 14. Modifications to the Terms
              </h2>
              <p>
                Watch1Do1 may update these Terms from time to time. Continued use constitutes acceptance of updated Terms.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
