
import React from 'react';
import { ArrowLeftIcon, ShieldIcon } from './IconComponents';

interface PrivacyPolicyProps {
  onBack: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 mb-8 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all group">
        <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back
      </button>

      <div className="bg-slate-800 rounded-[2.5rem] p-10 md:p-14 border border-slate-700 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <ShieldIcon className="w-48 h-48 text-white" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-5 mb-10">
            <div className="p-4 bg-[#7D8FED]/10 rounded-2xl border border-[#7D8FED]/20">
              <ShieldIcon className="w-8 h-8 text-[#7D8FED]" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tighter">Privacy Policy</h1>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Effective Date: April 16, 2026</p>
            </div>
          </div>

          <div className="space-y-10 text-slate-400 text-sm leading-relaxed">
            <p className="border-l-2 border-[#7D8FED] pl-6 py-2 italic font-medium">
              Watch1Do1 (“we,” “our,” or “the Platform”) respects your privacy and is committed to handling data responsibly.
            </p>

            <section>
              <h2 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#7D8FED] rounded-full" /> 1. Information We Collect
              </h2>
              <p className="mb-4">We collect only the information necessary to operate the Platform:</p>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-white text-[10px] font-black uppercase tracking-widest mb-2">Account Information</h3>
                  <ul className="text-xs space-y-1 list-disc pl-4">
                    <li>Email address</li>
                    <li>Display name</li>
                    <li>Subscription status (if applicable)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-white text-[10px] font-black uppercase tracking-widest mb-2">Creator & Content Data</h3>
                  <ul className="text-xs space-y-1 list-disc pl-4">
                    <li>Videos, images, URLs, or text submitted for analysis</li>
                    <li>Project metadata generated from submissions</li>
                    <li>Creator-declared items and build information</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-white text-[10px] font-black uppercase tracking-widest mb-2">Usage & Interaction Data</h3>
                  <ul className="text-xs space-y-1 list-disc pl-4">
                    <li>Page views</li>
                    <li>Product link clicks</li>
                    <li>“Buy” interactions</li>
                    <li>Planning Kit interactions</li>
                  </ul>
                </div>
              </div>
              <p className="mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-tight">This data is used to improve platform functionality, attribution accuracy, and execution outcomes.</p>
            </section>

            <section>
              <h2 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#7D8FED] rounded-full" /> 2. How We Use AI
              </h2>
              <p className="mb-4">Watch1Do1 uses Google Gemini AI models to analyze video transcripts, visual frames, metadata, and contextual signals. AI processing is used solely to identify tools, materials, and project requirements and generate Planning Kits.</p>
              
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700 space-y-4">
                <h3 className="text-white text-[10px] font-black uppercase tracking-widest">Important Clarifications:</h3>
                <ul className="text-xs space-y-2">
                  <li className="flex items-center gap-2 italic">
                    <span className="text-[#7D8FED] font-black">»</span> User content is not used to train AI models
                  </li>
                  <li className="flex items-center gap-2 italic">
                    <span className="text-[#7D8FED] font-black">»</span> AI outputs are assistive and reviewed by humans
                  </li>
                  <li className="flex items-center gap-2 italic">
                    <span className="text-[#7D8FED] font-black">»</span> AI does not autonomously monetize or endorse products
                  </li>
                </ul>
              </div>
              <p className="mt-4">Published creator content may be stored as part of the community library to improve collective execution knowledge.</p>
            </section>

            <section>
              <h2 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#7D8FED] rounded-full" /> 3. Cookies & Tracking Technologies
              </h2>
              <p className="mb-4">We use limited, functional tracking technologies, including cookies and local storage, to attribute affiliate conversions, prevent fraud, and support platform analytics.</p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-700/50">
                  <p className="text-[9px] font-black uppercase tracking-tighter text-slate-500 mb-2">Scope</p>
                  <p className="text-[11px]">Do not track users across unrelated websites.</p>
                </div>
                <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-700/50">
                  <p className="text-[9px] font-black uppercase tracking-tighter text-slate-500 mb-2">Context</p>
                  <p className="text-[11px]">Are used only within Watch1Do1 and partner flows.</p>
                </div>
                <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-700/50">
                  <p className="text-[9px] font-black uppercase tracking-tighter text-slate-500 mb-2">Security</p>
                  <p className="text-[11px]">Do not store sensitive personal information.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#7D8FED] rounded-full" /> 4. Affiliate & Third-Party Services
              </h2>
              <p className="mb-4">Watch1Do1 may link to third-party retailers and participate in affiliate programs.</p>
              <ul className="text-xs space-y-1 list-disc pl-4">
                <li>Purchases occur on third-party sites</li>
                <li>Third-party privacy practices govern checkout and fulfillment</li>
                <li>Watch1Do1 does not sell personal data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#7D8FED] rounded-full" /> 5. Data Sharing
              </h2>
              <p className="mb-4">We do not sell or rent personal data. We may share limited information with affiliate networks (for attribution), cloud/analytics providers (to operate the Platform), and legal authorities if required by law.</p>
              <p className="text-[10px] font-bold text-[#7D8FED] uppercase tracking-widest">All partners are required to follow applicable data protection standards.</p>
            </section>

            <section>
              <h2 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#7D8FED] rounded-full" /> 6. Data Retention
              </h2>
              <p className="mb-4">We retain data only as long as necessary to provide the Service, meet legal obligations, and maintain anonymized analytics. Users may request deletion of their account and associated personal data.</p>
            </section>

            <section>
              <h2 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#7D8FED] rounded-full" /> 7. Your Rights
              </h2>
              <p className="mb-4">Depending on your jurisdiction, you may have the right to access, correct, or delete your personal information, or withdraw consent.</p>
              <p className="text-slate-300 font-bold">To exercise these rights, contact: team@watch1do1.com</p>
            </section>

            <section>
              <h2 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#7D8FED] rounded-full" /> 8. Security
              </h2>
              <p>We implement reasonable administrative, technical, and organizational safeguards to protect data against unauthorized access, loss, or misuse.</p>
            </section>

            <section>
              <h2 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#7D8FED] rounded-full" /> 9. Changes to This Policy
              </h2>
              <p>We may update this Privacy Policy periodically. Continued use of the Platform constitutes acceptance of revisions.</p>
            </section>

            <section className="pt-10 border-t border-slate-700">
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700">
                <p className="text-[11px] font-bold text-slate-500 text-center leading-relaxed">
                  10. Contact: Questions about privacy or data practices may be sent to <span className="text-white">team@watch1do1.com</span>.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
