
import React from 'react';
import { ProjectInsights as IProjectInsights, ProjectCostEstimate, SafetyItem } from '../types';
import { DollarSignIcon, ShieldIcon, SparkleIcon, CheckCircleIcon, RefreshCwIcon, MedalIcon, TrophyIcon } from './IconComponents';

interface ProjectInsightsProps {
    insights: IProjectInsights;
}

const ProjectInsights: React.FC<ProjectInsightsProps> = ({ insights }) => {
    const { costEstimate, safetyProtocol, difficulty, timeEstimate, toolsRequired } = insights;

    // Robust price parsing for calculations
    const parsePrice = (str: string) => parseFloat(str.replace(/[^0-9.]/g, '')) || 0;

    // Dynamic cost scaling logic
    const budgetNum = parsePrice(costEstimate.budgetTotal);
    const proNum = parsePrice(costEstimate.proTotal);
    const totalWeight = budgetNum + proNum;
    const budgetPercent = totalWeight > 0 ? Math.round((budgetNum / totalWeight) * 100) : 50;

    const getSeverityDetails = (severity: string) => {
        switch (severity?.toLowerCase()) {
            case 'high': return { 
                class: 'bg-rose-500/20 text-rose-500 border-rose-500/30', 
                label: 'Critical Risk',
                tip: 'Requires specialized PPE and extreme caution.'
            };
            case 'medium': return { 
                class: 'bg-amber-500/20 text-amber-500 border-amber-500/30', 
                label: 'Moderate',
                tip: 'Standard safety equipment mandatory.' 
            };
            default: return { 
                class: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30', 
                label: 'Low Risk',
                tip: 'General workbench safety applies.'
            };
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Operational Tempo Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/60 p-5 rounded-[1.5rem] border border-slate-700/50 shadow-inner flex flex-col items-center text-center">
                    <MedalIcon className="w-5 h-5 text-amber-500 mb-2" />
                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Hub Clearance</p>
                    <p className="text-sm font-black text-white uppercase tracking-tight">{difficulty || 'Unknown'}</p>
                </div>
                <div className="bg-slate-800/60 p-5 rounded-[1.5rem] border border-slate-700/50 shadow-inner flex flex-col items-center text-center">
                    <RefreshCwIcon className="w-5 h-5 text-[#7D8FED] mb-2" />
                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Temporal Projection</p>
                    <p className="text-sm font-black text-white uppercase tracking-tight">{timeEstimate || 'N/A'}</p>
                </div>
            </div>

            {/* Essential Tools Section */}
            {toolsRequired && toolsRequired.length > 0 && (
                <section className="bg-slate-900/40 rounded-[2rem] border border-slate-700/50 p-6 overflow-hidden">
                    <div className="flex items-center gap-3 mb-4">
                        <TrophyIcon className="w-4 h-4 text-slate-500" />
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Essential Workbench Setup</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {toolsRequired.map((tool, idx) => (
                            <span key={idx} className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-[9px] font-black text-slate-300 uppercase tracking-tight">
                                {tool}
                            </span>
                        ))}
                    </div>
                </section>
            )}

            {/* Cost Estimator Section */}
            <section className="bg-slate-900/40 rounded-[2rem] border border-slate-700/50 overflow-hidden shadow-2xl">
                <div className="p-4 bg-slate-800/80 border-b border-slate-700/50 flex items-center justify-between">
                    <h3 className="font-black text-white text-[11px] uppercase tracking-widest flex items-center gap-2">
                        <DollarSignIcon className="w-4 h-4 text-emerald-500" />
                        Cost Projection
                    </h3>
                    <div className="text-[8px] font-black uppercase text-slate-600 tracking-[0.2em]">V3 Engineering Audit</div>
                </div>
                
                <div className="p-8">
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div className="text-center">
                            <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-2">{costEstimate.budgetName}</p>
                            <p className="text-3xl font-black text-emerald-400 tracking-tighter">{costEstimate.budgetTotal}</p>
                        </div>
                        <div className="text-center relative">
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-px bg-slate-800"></div>
                            <p className="text-[8px] font-black uppercase text-[#7D8FED] tracking-widest mb-2">{costEstimate.proName}</p>
                            <p className="text-3xl font-black text-white tracking-tighter">{costEstimate.proTotal}</p>
                        </div>
                    </div>
                    
                    <div className="relative h-2.5 bg-slate-950 rounded-full mb-8 flex overflow-hidden border border-slate-800 shadow-inner">
                        <div 
                            className="h-full bg-emerald-500/60 transition-all duration-1000 ease-out" 
                            style={{ width: `${budgetPercent}%` }}
                        ></div>
                        <div 
                            className="h-full bg-[#7D8FED] transition-all duration-1000 ease-out" 
                            style={{ width: `${100 - budgetPercent}%` }}
                        ></div>
                        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-white/20"></div>
                    </div>

                    <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 border-dashed">
                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic text-center">
                            <SparkleIcon className="w-3.5 h-3.5 inline mr-2 text-amber-500" />
                            {costEstimate.description}
                        </p>
                    </div>
                </div>
            </section>

            {/* Safety Protocol Section */}
            <section className="bg-slate-900/40 rounded-[2rem] border border-slate-700/50 overflow-hidden shadow-2xl">
                <div className="p-4 bg-slate-800/80 border-b border-slate-700/50 flex items-center justify-between">
                    <h3 className="font-black text-white text-[11px] uppercase tracking-widest flex items-center gap-2">
                        <ShieldIcon className="w-4 h-4 text-rose-500" />
                        Safety Sweep
                    </h3>
                    <div className="text-[8px] font-black uppercase text-slate-600 tracking-[0.2em]">Halsted Compliance</div>
                </div>

                <div className="p-6 space-y-4">
                    {safetyProtocol.map((item, idx) => {
                        const sev = getSeverityDetails(item.severity);
                        return (
                            <div key={idx} className="flex gap-4 p-4 bg-slate-800/50 rounded-[1.5rem] border border-slate-700/30 group hover:border-[#7D8FED]/30 transition-all hover:translate-y-[-2px] shadow-lg">
                                <div 
                                    className={`flex-shrink-0 w-12 h-12 rounded-xl border flex flex-col items-center justify-center font-black text-[8px] uppercase tracking-tighter ${sev.class}`}
                                    title={sev.tip}
                                >
                                    <span>{item.severity || 'LOW'}</span>
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-xs font-black text-white uppercase tracking-tight mb-1 truncate">{item.task}</h4>
                                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{item.precaution}</p>
                                </div>
                            </div>
                        )
                    })}
                    
                    <div className="mt-6 pt-5 border-t border-slate-700/30 flex items-center justify-center">
                        <div className="flex items-center gap-3 px-6 py-2 bg-emerald-500/5 rounded-full border border-emerald-500/10">
                            <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Protocol Alignment Confirmed</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default ProjectInsights;
