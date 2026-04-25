
import React from 'react';
import { User, SubscriptionStatus } from '../types';
import { 
    ArrowLeftIcon, 
    CheckCircleIcon, 
    ShieldIcon, 
    BarChartIcon, 
    DollarSignIcon, 
    ExternalLinkIcon, 
    SparkleIcon,
    LockIcon,
    InfoIcon,
    MedalIcon
} from './IconComponents';

interface AffiliateGuideProps {
    onBack: () => void;
    currentUser: User | null;
}

const AffiliateGuide: React.FC<AffiliateGuideProps> = ({ onBack, currentUser }) => {
    const subscriptionStatus = currentUser?.subscriptionStatus || 'Free';
    const isPaidCreator = subscriptionStatus !== 'Free';
    const isProOrStudio = subscriptionStatus === 'Pro' || subscriptionStatus === 'Studio';

    const SectionHeader = ({ title, icon: Icon, isLocked }: { title: string, icon: any, isLocked?: boolean }) => (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${isLocked ? 'bg-slate-800 text-slate-500' : 'bg-[#7D8FED]/10 text-[#7D8FED]'}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <h2 className={`text-xl font-black uppercase tracking-widest ${isLocked ? 'text-slate-500' : 'text-white'}`}>
                    {title}
                </h2>
            </div>
            {isLocked && (
                <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-800 rounded-full border border-slate-700">
                    <LockIcon className="w-3 h-3 text-slate-500" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Paid Tiers Only</span>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 px-6 py-4">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <button 
                        onClick={onBack}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all"
                    >
                        <ArrowLeftIcon className="w-4 h-4" /> Back to Studio
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#7D8FED]/20 flex items-center justify-center">
                            <MedalIcon className="w-4 h-4 text-[#7D8FED]" />
                        </div>
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Creator Affiliate Guide</span>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 pt-16">
                {/* Hero Section */}
                <div className="text-center mb-20">
                    <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter mb-6 leading-tight">
                        Monetize Where You’re <span className="text-[#7D8FED]">Accountable</span>
                    </h1>
                    <p className="text-lg text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto">
                        How affiliate attribution works on Watch1Do1. Learn how to responsibly monetize your builds and apply to affiliate networks.
                    </p>
                </div>

                {/* Core Philosophy */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-[3rem] p-10 mb-12">
                    <SectionHeader title="1. Core Philosophy" icon={ShieldIcon} />
                    <div className="space-y-6">
                        <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-3xl">
                            <p className="text-emerald-500 font-black uppercase tracking-widest text-[10px] mb-2">The Golden Rule</p>
                            <p className="text-white font-bold leading-relaxed">
                                Affiliate links are allowed only where the creator is the authority.
                            </p>
                        </div>
                        <p className="leading-relaxed">
                            On Watch1Do1, creators may declare canonical items they built around. Affiliate attribution may be attached only to those items. All links are visibly labeled and never hidden.
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {['Viewers', 'Creators', 'Brands', 'Networks'].map(item => (
                                <div key={item} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-center">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Protects</span>
                                    <p className="text-white font-black text-xs mt-1">{item}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Traffic Quality */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-[3rem] p-10 mb-12">
                    <SectionHeader title="2. Execution-Stage Traffic" icon={BarChartIcon} />
                    <div className="space-y-6">
                        <p className="leading-relaxed">
                            Watch1Do1 traffic is execution-stage, not discovery-stage. Users arrive to prepare a specific project, confirm required tools, and assemble a complete kit.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { label: 'Higher Intent', desc: 'Users are ready to build, not just browsing.' },
                                { label: 'Fewer Clicks', desc: 'Intentional selection over impulsive browsing.' },
                                { label: 'Responsible Placement', desc: 'Products are required, not just promoted.' }
                            ].map(item => (
                                <div key={item.label} className="space-y-2">
                                    <p className="text-[#7D8FED] font-black text-[10px] uppercase tracking-widest">{item.label}</p>
                                    <p className="text-xs leading-relaxed text-slate-400">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Routing Mechanics */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-[3rem] p-10 mb-12">
                    <SectionHeader title="3. Routing Mechanics" icon={ExternalLinkIcon} />
                    <div className="space-y-6">
                        <div className="space-y-4">
                            {[
                                'Traffic originates from project builds, not content feeds',
                                'Products appear inside Planning Kits',
                                'Users actively select items as part of preparation',
                                'Outbound clicks route directly to merchants'
                            ].map((text, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                                    <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                                    <p className="text-xs font-bold text-white">{text}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {['No Incentives', 'No Link Stuffing', 'No AI Promotions'].map(tag => (
                                <span key={tag} className="px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-full text-[9px] font-black text-rose-500 uppercase tracking-widest">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Quality Controls */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-[3rem] p-10 mb-12">
                    <SectionHeader title="4. Quality & Safety" icon={SparkleIcon} />
                    <div className="space-y-6">
                        <p className="leading-relaxed">
                            We enforce strict standards to align with affiliate network quality requirements:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-6 bg-slate-950 rounded-3xl border border-slate-800">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Human Review</p>
                                <p className="text-xs leading-relaxed">Creators must review and approve all AI-suggested items before they are added to a canonical kit.</p>
                            </div>
                            <div className="p-6 bg-slate-950 rounded-3xl border border-slate-800">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Labeled Roles</p>
                                <p className="text-xs leading-relaxed">Items are clearly marked as Creator Declared, Platform Suggested, or Partner Official.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sample Language */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-[3rem] p-10 mb-12">
                    <SectionHeader title="5. Network Application Language" icon={InfoIcon} />
                    <div className="space-y-6">
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Use this language when applying to networks like Impact or CJ to describe your presence on Watch1Do1:
                        </p>
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-[#7D8FED] to-emerald-500 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                            <div className="relative p-8 bg-slate-950 rounded-3xl border border-slate-800 font-mono text-xs leading-relaxed text-slate-300 italic">
                                "I publish instructional build content on Watch1Do1, a project-execution platform. Products are included only when required for a specific build, and affiliate attribution is attached exclusively to creator-declared items used in execution. Traffic originates from users preparing to complete a project rather than passive browsing."
                            </div>
                        </div>
                    </div>
                </div>

                {/* Technical Implementation - GATED */}
                <div className={`bg-slate-900/50 border border-slate-800 rounded-[3rem] p-10 mb-12 transition-all ${!isPaidCreator ? 'opacity-60 grayscale' : ''}`}>
                    <SectionHeader title="6. Technical Implementation" icon={DollarSignIcon} isLocked={!isPaidCreator} />
                    {isPaidCreator ? (
                        <div className="space-y-6">
                            <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-3xl mb-4">
                                <p className="text-amber-500 font-black uppercase tracking-widest text-[10px] mb-2">Subscription Note</p>
                                <p className="text-xs leading-relaxed text-slate-300">
                                    Creator Plus members can receive tips and view affiliate education, but cannot declare canonical items. Authority requires review, not just payment.
                                </p>
                            </div>
                            <p className="leading-relaxed">
                                To declare affiliate items inside a Planning Kit, you must:
                            </p>
                            <div className="space-y-4">
                                {[
                                    'Hold an active Pro or Studio subscription',
                                    'Have been approved by the affiliate merchant',
                                    'Declare only items you actually used in the build'
                                ].map((text, i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                                        <div className="w-2 h-2 rounded-full bg-[#7D8FED]"></div>
                                        <p className="text-xs font-bold text-white">{text}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="p-6 bg-[#7D8FED]/5 border border-[#7D8FED]/10 rounded-3xl">
                                <p className="text-[#7D8FED] font-black uppercase tracking-widest text-[10px] mb-2">How to Add Links</p>
                                <p className="text-xs leading-relaxed text-slate-300">
                                    In your Creator Studio, select "Audit Terminal" for any published video. You will see a field to "Inject Affiliate URL" for each item you have declared.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-sm font-bold text-slate-500 mb-6">Upgrade to Plus or higher to unlock technical affiliate documentation.</p>
                            <button className="px-8 py-4 bg-[#7D8FED] text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-[#7D8FED]/20">
                                View Creator Tiers
                            </button>
                        </div>
                    )}
                </div>

                {/* Analytics & Authority - GATED */}
                <div className={`bg-slate-900/50 border border-slate-800 rounded-[3rem] p-10 mb-12 transition-all ${!isProOrStudio ? 'opacity-60 grayscale' : ''}`}>
                    <SectionHeader title="7. Declaration & Authority" icon={BarChartIcon} isLocked={!isProOrStudio} />
                    {isProOrStudio ? (
                        <div className="space-y-6">
                            <p className="leading-relaxed">
                                Pro and Studio members can access deep analytics to share with networks:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { label: 'Project-Level Views', val: 'Total reach of your build instructions.' },
                                    { label: 'Planning Kit Additions', val: 'How many users are actively kitting your build.' },
                                    { label: 'Item-Level Click-Through', val: 'Performance data for specific declared items.' },
                                    { label: 'Contextual Relevance', val: 'Difficulty and category breakdown for your traffic.' }
                                ].map(stat => (
                                    <div key={stat.label} className="p-6 bg-slate-950 rounded-3xl border border-slate-800">
                                        <p className="text-[9px] font-black text-[#7D8FED] uppercase tracking-widest mb-2">{stat.label}</p>
                                        <p className="text-xs text-slate-400">{stat.val}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-8 p-6 bg-slate-950 rounded-3xl border border-slate-800 text-center">
                                <p className="text-[10px] font-bold text-slate-500 italic">
                                    Watch1Do1 does not broker, negotiate, or guarantee affiliate relationships. Approval decisions are made solely by affiliate networks and merchants.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-sm font-bold text-slate-500 mb-6">Pro & Studio tiers unlock advanced analytics and authority mechanics.</p>
                        </div>
                    )}
                </div>

                {/* Footer CTA */}
                <div className="text-center pt-10">
                    <div className="mb-8 flex flex-col items-center gap-2">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">
                            Responsible Monetization • Built for Makers
                        </p>
                        <p className="text-[8px] font-bold text-slate-700 uppercase tracking-widest">
                            Trust Certification Document v1.0
                        </p>
                    </div>
                    <button 
                        onClick={onBack}
                        className="px-12 py-5 bg-slate-800 text-white font-black rounded-3xl border border-slate-700 hover:bg-slate-700 transition-all uppercase tracking-widest text-xs"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AffiliateGuide;
