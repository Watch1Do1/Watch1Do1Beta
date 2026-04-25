import React, { useState, useEffect } from 'react';
import { CloseIcon, CookieIcon, TrashIcon } from './IconComponents';

interface DebugTrackingPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TrackingEvent {
    key: string;
    product: string;
    retailer: string;
    timestamp: string;
}

const DebugTrackingPanel: React.FC<DebugTrackingPanelProps> = ({ isOpen, onClose }) => {
    const [events, setEvents] = useState<TrackingEvent[]>([]);

    const refreshCookies = () => {
        const cookies = document.cookie.split(';');
        const trackingEvents: TrackingEvent[] = [];

        cookies.forEach(cookie => {
            const [name, value] = cookie.trim().split('=');
            if (name.startsWith('clicked_')) {
                const decodedName = decodeURIComponent(name);
                const parts = decodedName.replace('clicked_', '').split('_at_');
                if (parts.length === 2) {
                    trackingEvents.push({
                        key: name,
                        product: parts[0],
                        retailer: parts[1],
                        timestamp: value
                    });
                }
            }
        });
        trackingEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setEvents(trackingEvents);
    };

    useEffect(() => {
        if (isOpen) {
            refreshCookies();
            const interval = setInterval(refreshCookies, 2000);
            return () => clearInterval(interval);
        }
    }, [isOpen]);

    const clearTracking = () => {
        events.forEach(event => {
            document.cookie = `${event.key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });
        refreshCookies();
    };

    return (
        <>
             <div 
                className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />
            <div
                className={`fixed bottom-0 left-0 w-full sm:w-96 h-[60vh] sm:h-full bg-slate-900 border-r border-slate-700 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex flex-col h-full">
                     <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-800/50">
                        <h2 className="text-xl font-black text-white flex items-center gap-3">
                            <CookieIcon className="w-6 h-6 text-amber-500" />
                            Workshop Debug
                        </h2>
                        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                            <CloseIcon className="w-8 h-8" />
                        </button>
                    </div>

                    <div className="flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar">
                        {events.length === 0 ? (
                            <div className="text-center py-20 px-6">
                                <CookieIcon className="w-16 h-16 text-slate-800 mx-auto mb-4 opacity-20" />
                                <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">No tracking events found</p>
                                <p className="text-xs text-slate-600 mt-2">Interact with project products to generate cookies</p>
                            </div>
                        ) : (
                            events.map((event) => (
                                <div key={event.key} className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="font-black text-white text-xs uppercase tracking-tight truncate pr-2">{event.product}</p>
                                        <span className="text-[8px] font-black bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-widest">
                                            COOKIE
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase">Retailer:</span>
                                        <span className="text-[10px] text-[#7D8FED] font-black uppercase">{event.retailer}</span>
                                    </div>
                                    <p className="text-[9px] text-slate-500 font-mono">
                                        {new Date(event.timestamp).toLocaleTimeString()} • {new Date(event.timestamp).toLocaleDateString()}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-6 border-t border-slate-800 bg-slate-800/30">
                        <button 
                            onClick={clearTracking}
                            disabled={events.length === 0}
                            className="w-full flex items-center justify-center gap-2 bg-rose-500/10 text-rose-500 border border-rose-500/20 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-rose-500/20 transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            <TrashIcon className="w-4 h-4" /> Clear All Cookies
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
};

export default DebugTrackingPanel;