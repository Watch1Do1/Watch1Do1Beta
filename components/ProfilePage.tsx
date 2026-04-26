
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, Video, ProjectCategory, MakerRank } from '../types';
import { CameraIcon, SparkleIcon, UserIcon, HeartIcon, RefreshCwIcon, TrophyIcon, MedalIcon, DollarSignIcon, ShieldIcon, ArrowLeftIcon, PlusIcon, TrashIcon, CheckCircleIcon, PhotoIcon, ShoppingCartIcon, ExternalLinkIcon, EyeIcon, ShareIcon } from './IconComponents';
import VideoCard from './VideoCard';

interface ProfilePageProps {
  user: User;
  currentUser?: User | null;
  userVideos: Video[];
  scannedVideos: Video[];
  allVideos: Video[];
  onAvatarChange: (file: File) => void;
  onVideoClick: (video: Video) => void;
  onBack: () => void;
  onProfileUpdate: (updatedInfo: Partial<User>) => void;
  onManageSubscription: () => void;
  onShare: (video: Video, isCreator: boolean) => void;
  defaultTab?: ProfileTab;
}

type ProfileTab = 'overview' | 'showcase' | 'favorites' | 'inventory' | 'studio' | 'scans' | 'preferences';

const ProfilePage: React.FC<ProfilePageProps> = ({ 
  user, currentUser, userVideos, scannedVideos, allVideos, onAvatarChange, onVideoClick, onBack, onProfileUpdate, onManageSubscription, onShare, defaultTab = 'overview' 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [handle, setHandle] = useState(user.handle || '');
  const [bio, setBio] = useState(user.bio || '');
  const [activeTab, setActiveTab] = useState<ProfileTab>(defaultTab as ProfileTab);
  const [newTool, setNewTool] = useState('');
  const [venmoHandle, setVenmoHandle] = useState(user.venmoHandle || '');
  const [isUpdatingGateway, setIsUpdatingGateway] = useState(false);

  useEffect(() => {
    setDisplayName(user.displayName);
    setHandle(user.handle || '');
    setBio(user.bio || '');
    setVenmoHandle(user.venmoHandle || '');
  }, [user]);

  useEffect(() => { setActiveTab(defaultTab as ProfileTab); }, [defaultTab]);

  const handleAvatarClick = () => { fileInputRef.current?.click(); };
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onAvatarChange(file);
  };

  const handleQRUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (e) => onProfileUpdate({ tipQrUrl: e.target?.result as string });
          reader.readAsDataURL(file);
      }
  };

  const handleSaveChanges = () => {
    onProfileUpdate({ displayName, handle, bio });
    setIsEditing(false);
  };

  const handleSaveGateway = () => {
      setIsUpdatingGateway(true);
      setTimeout(() => {
          onProfileUpdate({ venmoHandle });
          setIsUpdatingGateway(false);
      }, 800);
  };

  const addTool = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTool.trim()) return;
      onProfileUpdate({ ownedTools: [...(user.ownedTools || []), newTool.trim()] });
      setNewTool('');
  };

  const removeTool = (toolName: string) => {
      onProfileUpdate({ ownedTools: (user.ownedTools || []).filter(t => t !== toolName) });
  };
  
  const favoritedVideos = allVideos.filter(video => user.favoritedVideoIds?.includes(video.id));
  
  // XP Calculations Logic
  const xp = user.makerXP || 0;
  const thresholds: {rank: MakerRank, min: number, max: number}[] = [
      { rank: 'Apprentice', min: 0, max: 500 },
      { rank: 'Studio Lead', min: 500, max: 1500 },
      { rank: 'Senior Builder', min: 1500, max: 3000 },
      { rank: 'Master Maker', min: 3000, max: 5000 },
      { rank: 'Grand Architect', min: 5000, max: 10000 }
  ];

  const currentLevel = thresholds.find(t => xp < t.max) || thresholds[thresholds.length - 1];
  const progressPercent = Math.min(((xp - currentLevel.min) / (currentLevel.max - currentLevel.min)) * 100, 100);
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (progressPercent / 100) * circumference;

  const TabButton = ({ tab, label, icon: Icon, isNew = false }: { tab: ProfileTab; label: string, icon?: any, isNew?: boolean }) => (
    <button onClick={() => setActiveTab(tab)} className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 flex-shrink-0 snap-center ${activeTab === tab ? 'bg-[#7D8FED] text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-slate-700/50'}`}>
        {Icon && <Icon className="w-4 h-4" />}{label}{isNew && <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full border border-slate-900 animate-pulse"></span>}
    </button>
  );

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in max-h-full">
      <div className="max-w-6xl mx-auto">
        <button onClick={onBack} className="mb-8 flex items-center gap-2 text-[#7D8FED] font-black uppercase text-[10px] tracking-[0.2em] hover:translate-x-[-4px] transition-transform"><ArrowLeftIcon className="w-4 h-4" /> Back to Hub</button>

        <div className="bg-slate-800 rounded-[3rem] p-8 md:p-12 border border-slate-700 shadow-2xl relative overflow-hidden mb-12">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none"><TrophyIcon className="w-64 h-64 text-white" /></div>
          <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
            <div className="relative group flex-shrink-0">
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-slate-700 border-4 border-[#7D8FED] p-1 overflow-hidden shadow-2xl">{user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full flex items-center justify-center"><UserIcon className="w-16 h-16 text-slate-500" /></div>}</div>
              <button onClick={handleAvatarClick} className="absolute inset-0 w-full h-full bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"><CameraIcon className="w-8 h-8" /></button>
            </div>
            <div className="flex-grow text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center gap-4 mb-2">
                <div className="flex flex-col">
                  <h1 className="text-4xl font-black text-white tracking-tighter">{user.displayName}</h1>
                  {user.handle && <p className="text-[#7D8FED] font-black text-xs uppercase tracking-[0.3em] mt-1">@{user.handle}</p>}
                </div>
              </div>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-6">
                {currentUser?.email === user.email && <p className="text-slate-500 font-bold text-sm">{user.email}</p>}
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase rounded-full border border-emerald-500/20">
                  <CheckCircleIcon className="w-3.5 h-3.5" /> 18+ Safety Verified
                </div>
              </div>
              
              {isEditing ? (
                  <div className="space-y-4 max-w-lg mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Display Name</label>
                            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white text-sm" placeholder="Public Name" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Maker Handle</label>
                            <input type="text" value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-[#7D8FED] text-sm font-black" placeholder="maker_handle" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Maker Bio</label>
                        <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-300 text-sm italic" rows={2} />
                    </div>
                  </div>
              ) : (
                <p className="text-slate-400 italic text-lg max-w-2xl mb-8">"{user.bio || 'Building the future, one project at a time.'}"</p>
              )}
              
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  {isEditing ? (
                      <button onClick={handleSaveChanges} className="px-8 py-4 text-[10px] font-black uppercase bg-[#7D8FED] text-white rounded-2xl shadow-xl shadow-[#7D8FED]/20 hover:scale-105 transition-all">Update Identity</button>
                  ) : (
                      <button onClick={() => setIsEditing(true)} className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 border border-slate-700 rounded-2xl hover:bg-slate-700 transition-all">Edit Hub Profile</button>
                  )}
                  <div className="group relative">
                    <button onClick={onManageSubscription} className={`px-8 py-4 text-[10px] font-black uppercase rounded-2xl transition-all shadow-xl flex items-center gap-3 ${user.subscriptionStatus !== 'Free' ? 'bg-[#7D8FED]/10 text-[#7D8FED] border border-[#7D8FED]/20 overflow-hidden' : 'bg-amber-500 text-slate-900 shadow-amber-500/10 hover:bg-amber-400'}`}>
                        {user.subscriptionStatus !== 'Free' && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>}
                        <TrophyIcon className={`w-4 h-4 ${user.subscriptionStatus !== 'Free' ? 'text-[#7D8FED]' : 'text-slate-900'}`} />
                        <span>{user.subscriptionStatus === 'Free' ? 'Upgrade — Save 30%' : `${user.subscriptionStatus} Support Active`}</span>
                    </button>
                  </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 p-1.5 bg-slate-800 rounded-2xl w-full max-w-5xl mb-12 border border-slate-700 overflow-x-auto no-scrollbar snap-x snap-mandatory">
            <TabButton tab="overview" label="Wallet" icon={DollarSignIcon} />
            <TabButton tab="showcase" label="Mastery Showcase" icon={TrophyIcon} />
            <TabButton tab="favorites" label="Saved Hubs" icon={HeartIcon} />
            <TabButton tab="scans" label="My Scans" icon={EyeIcon} />
            <TabButton tab="inventory" label="Planning Kits" icon={ShoppingCartIcon} />
            <TabButton tab="studio" label="My Teach Ones" icon={RefreshCwIcon} />
            <TabButton tab="preferences" label="Safety & Signal" icon={SparkleIcon} />
        </div>

        <div className="min-h-[500px]">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
              <div className="bg-slate-800 rounded-[2.5rem] p-10 border border-slate-700 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black text-white tracking-tight">{user.gamificationEnabled ? 'Studio Progression' : 'Account Statistics'}</h3>
                    <span className="px-3 py-1 bg-slate-900 text-slate-400 text-[8px] font-black uppercase rounded-lg border border-slate-800">{user.subscriptionStatus} TIER</span>
                </div>
                {user.gamificationEnabled ? (
                    <div className="flex items-center gap-10 mb-10">
                        <div className="relative"><svg className="w-24 h-24 transform -rotate-90"><circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-900" /><circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeOffset} className="text-[#7D8FED] transition-all duration-1000 ease-out" /></svg><div className="absolute inset-0 flex items-center justify-center font-black text-xl text-white">{Math.round(progressPercent)}%</div></div>
                        <div><p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Maker XP: {xp}</p><p className="text-2xl font-black text-white tracking-tight">{user.makerRank}</p><p className="text-[10px] font-bold text-[#7D8FED] uppercase mt-2">{currentLevel.max - xp} XP to {thresholds[thresholds.indexOf(currentLevel)+1]?.rank || 'Ascension'}</p></div>
                    </div>
                ) : <div className="grid grid-cols-1 gap-4 mb-10"><div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50 flex justify-between items-center"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Workshop Activity Score</span><span className="text-xl font-black text-white">{xp} Units</span></div></div>}
                <div className="grid grid-cols-2 gap-4 pt-8 border-t border-slate-700"><div className="text-center p-4 bg-slate-900/40 rounded-2xl border border-slate-700/50"><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Built</p><p className="text-xl font-black text-white">{user.completedProjects?.length || 0}</p></div><div className="text-center p-4 bg-slate-900/40 rounded-2xl border border-slate-700/50"><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Saved</p><p className="text-xl font-black text-white">{user.favoritedVideoIds?.length || 0}</p></div></div>
              </div>
              <div className="bg-[#7D8FED]/5 rounded-[2.5rem] p-10 border border-[#7D8FED]/20 shadow-xl flex flex-col relative overflow-hidden">
                  <div className="mb-8"><h3 className="text-2xl font-black text-white tracking-tight">Direct Payouts</h3><p className="text-slate-500 text-xs mt-1 font-bold uppercase tracking-widest">Reported Peer Support</p></div>
                  <div className="bg-slate-900/80 p-8 rounded-3xl border border-slate-700 mb-8 flex-grow flex flex-col justify-center"><div className="flex items-center justify-between mb-2"><p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Self-Reported Tips</p><span className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded border border-emerald-500/20 uppercase">Honor System</span></div><p className="text-4xl font-black text-white tracking-tighter mb-6">${(user.totalTipsReported || 0).toLocaleString()}</p><button onClick={() => setActiveTab('preferences')} className="py-4 bg-[#7D8FED]/10 text-[#7D8FED] font-black uppercase text-[10px] tracking-widest rounded-xl border border-[#7D8FED]/20 hover:bg-[#7D8FED]/20 transition-all">Manage Gateway Settings</button></div>
                  <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center gap-3"><ShieldIcon className="w-5 h-5 text-emerald-500" /><p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest leading-tight">Zero-Knowledge: No transaction data is stored on our servers.</p></div>
              </div>
            </div>
          )}

          {activeTab === 'showcase' && (
              <div className="animate-fade-in">
                  <div className="flex items-center justify-between mb-8"><h2 className="text-3xl font-black text-white tracking-tighter">Maker Mastery Gallery</h2>{(user.completedProjects || []).length > 0 && <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{user.completedProjects?.length} Milestones Reached</span>}</div>
                  {(user.completedProjects || []).length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                          {[...(user.completedProjects || [])].sort((a, b) => new Date(b.completionDate).getTime() - new Date(a.completionDate).getTime()).map((p, idx) => {
                                const originalHub = allVideos.find(v => v.id === p.videoId);
                                return (
                                    <div key={idx} className="bg-slate-800 border border-slate-700 rounded-[2.5rem] overflow-hidden group shadow-xl hover:translate-y-[-4px] transition-all">
                                        <div className="aspect-square relative overflow-hidden"><img src={p.resultImageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" alt="" /><div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80"></div><div className="absolute bottom-6 left-6 right-6"><p className="text-[9px] font-black uppercase tracking-widest text-[#7D8FED] mb-1">Completed {new Date(p.completionDate).toLocaleDateString()}</p><h3 className="text-xl font-black text-white tracking-tight leading-none">{p.projectTitle}</h3></div></div>
                                        <div className="p-6 flex flex-col gap-4">
                                            <p className="text-sm text-slate-400 italic mb-2 leading-relaxed line-clamp-2">"{p.note || 'Build success.'}"</p>
                                            <div className="flex gap-3">
                                                {originalHub && <button onClick={() => onVideoClick(originalHub)} className="flex-1 py-3 bg-slate-900 border border-slate-700 rounded-xl text-[9px] font-black text-[#7D8FED] uppercase tracking-widest hover:bg-slate-700 transition-all flex items-center justify-center gap-2"><EyeIcon className="w-3.5 h-3.5" /> Enter Hub</button>}
                                                <button onClick={() => originalHub && onShare(originalHub, false)} className="p-3 bg-slate-700 rounded-xl text-white hover:bg-slate-600 transition-all"><ShareIcon className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                      </div>
                  ) : <div className="text-center py-32 bg-slate-800/50 rounded-[3rem] border-2 border-dashed border-slate-700"><CameraIcon className="w-16 h-16 text-slate-700 mx-auto mb-6" /><p className="text-xl font-black text-slate-500 uppercase tracking-widest mb-8">Gallery Empty • Start Building</p><button onClick={onBack} className="px-8 py-4 bg-[#7D8FED] text-white font-black uppercase rounded-2xl text-[10px] tracking-widest shadow-xl">Explore Project Hubs</button></div>}
              </div>
          )}

          {activeTab === 'studio' && (
            <div className="animate-fade-in"><h2 className="text-3xl font-black text-white tracking-tighter mb-8">My Teach Ones</h2>{(userVideos || []).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {(userVideos || []).map(video => (
                        <div key={video.id} className="relative group">
                            <VideoCard video={video} onSelect={onVideoClick} isProfileView={true} currentUser={user} />
                            <button 
                                onClick={(e) => { e.stopPropagation(); onShare(video, true); }}
                                className="absolute top-4 left-4 p-3 bg-slate-900/80 backdrop-blur-md rounded-xl text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-2xl border border-white/10"
                                title="Promote Hub"
                            >
                                <ShareIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : <div className="text-center py-32 bg-slate-800/50 rounded-[3rem] border-2 border-dashed border-slate-700"><RefreshCwIcon className="w-16 h-16 text-slate-700 mx-auto mb-6" /><p className="text-xl font-black text-slate-500 uppercase tracking-widest mb-8">No Teach Ones Yet</p><button onClick={onBack} className="px-8 py-4 bg-[#7D8FED] text-white font-black uppercase rounded-2xl text-[10px] tracking-widest shadow-xl">Initialize a Hub</button></div>}</div>
          )}

          {activeTab === 'scans' && (
            <div className="animate-fade-in"><h2 className="text-3xl font-black text-white tracking-tighter mb-8">My Media Scans</h2>{(scannedVideos || []).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {(scannedVideos || []).map(video => (
                        <div key={video.id} className="relative group">
                            <VideoCard video={video} onSelect={onVideoClick} isProfileView={true} currentUser={user} />
                        </div>
                    ))}
                </div>
            ) : <div className="text-center py-32 bg-slate-800/50 rounded-[3rem] border-2 border-dashed border-slate-700"><EyeIcon className="w-16 h-16 text-slate-700 mx-auto mb-6" /><p className="text-xl font-black text-slate-500 uppercase tracking-widest mb-8">No Scans Yet</p><button onClick={onBack} className="px-8 py-4 bg-[#7D8FED] text-white font-black uppercase rounded-2xl text-[10px] tracking-widest shadow-xl">Scan a Tutorial</button></div>}</div>
          )}

          {activeTab === 'preferences' && (
              <div className="animate-fade-in max-w-4xl">
                  <h2 className="text-3xl font-black text-white tracking-tighter mb-12">Safety & Signal Preferences</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="bg-slate-800 rounded-[2.5rem] p-10 border border-slate-700 shadow-xl space-y-8">
                          <div>
                              <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">Protocol Display</h3>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Customize how the Studio monitors your progress and signals achievement.</p>
                          </div>
                          
                          <div className="space-y-6">
                              <div className="flex items-center justify-between p-6 bg-slate-900/50 rounded-2xl border border-slate-700/50">
                                  <div>
                                      <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1">XP & Rank Signaling</p>
                                      <p className="text-[8px] font-bold text-slate-600 uppercase">Enable Maker XP and Level systems.</p>
                                  </div>
                                  <button 
                                      onClick={() => onProfileUpdate({ gamificationEnabled: !user.gamificationEnabled })}
                                      className={`w-12 h-6 rounded-full transition-colors relative ${user.gamificationEnabled ? 'bg-[#7D8FED]' : 'bg-slate-700'}`}
                                  >
                                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${user.gamificationEnabled ? 'left-7' : 'left-1'}`}></div>
                                  </button>
                              </div>

                              <div className="p-6 bg-[#7D8FED]/5 rounded-2xl border border-[#7D8FED]/10">
                                  <div className="flex items-center gap-3 mb-4">
                                      <SparkleIcon className="w-5 h-5 text-[#7D8FED]" />
                                      <p className="text-[10px] font-black text-[#7D8FED] uppercase tracking-widest">Subscriber Perk</p>
                                  </div>
                                  <p className="text-xs text-slate-400 leading-relaxed mb-4">Plus and Pro members receive a <span className="text-white font-bold">2.5x XP Boost</span> on all verified build completions.</p>
                                  <button onClick={onManageSubscription} className="text-[9px] font-black text-white uppercase tracking-[0.2em] underline underline-offset-4 decoration-[#7D8FED]">View Tiers</button>
                              </div>
                          </div>
                      </div>

                      <div className="bg-slate-800 rounded-[2.5rem] p-10 border border-slate-700 shadow-xl space-y-8 relative overflow-hidden">
                          {user.subscriptionStatus === 'Free' && (
                              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                                  <TrophyIcon className="w-12 h-12 text-amber-500 mb-4" />
                                  <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Creator Support Locked</h4>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed mb-6">Upgrade to Creator Plus to accept direct support from your fans.</p>
                                  <button onClick={onManageSubscription} className="px-6 py-3 bg-amber-500 text-slate-900 text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all">Unlock Gateway</button>
                              </div>
                          )}
                          <div>
                              <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">Payout Gateway</h3>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Configure your P2P markers so fans can support your Teach Ones directly.</p>
                          </div>

                          <div className="space-y-6">
                              <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Venmo Handle (@)</label>
                                  <input 
                                      type="text" 
                                      placeholder="@YourHandle" 
                                      value={venmoHandle}
                                      onChange={(e) => setVenmoHandle(e.target.value)}
                                      disabled={user.subscriptionStatus === 'Free'}
                                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-[#7D8FED] outline-none disabled:opacity-50" 
                                  />
                              </div>

                              <div className="space-y-4">
                                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Tip QR Code (Image)</label>
                                  <div 
                                      onClick={() => user.subscriptionStatus !== 'Free' && qrInputRef.current?.click()}
                                      className={`w-full h-32 bg-slate-900 border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center transition-all overflow-hidden ${user.subscriptionStatus === 'Free' ? 'cursor-not-allowed' : 'cursor-pointer hover:border-[#7D8FED]/50'}`}
                                  >
                                      <input type="file" ref={qrInputRef} onChange={handleQRUpload} className="hidden" accept="image/*" />
                                      {user.tipQrUrl ? (
                                          <img src={user.tipQrUrl} className="w-full h-full object-contain" alt="" />
                                      ) : (
                                          <>
                                              <PhotoIcon className="w-6 h-6 text-slate-600 mb-2" />
                                              <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest text-center px-4 leading-tight">Drop QR Code Here or Click to Upload</p>
                                          </>
                                      )}
                                  </div>
                              </div>

                              <button 
                                  onClick={handleSaveGateway}
                                  disabled={isUpdatingGateway || user.subscriptionStatus === 'Free'}
                                  className="w-full py-4 bg-[#7D8FED] text-white font-black uppercase text-[10px] tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                              >
                                  {isUpdatingGateway ? <RefreshCwIcon className="w-4 h-4 animate-spin" /> : 'Sync Gateway Markers'}
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
