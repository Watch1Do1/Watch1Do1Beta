
import React, { useState } from 'react';
import { CartItem, Video, Money } from '../types';
import { CloseIcon, TrashIcon, PlusIcon, MinusIcon, ShoppingCartIcon, ExternalLinkIcon, RefreshCwIcon, SendIcon, ShieldIcon, FileTextIcon, SparkleIcon, DollarSignIcon } from './IconComponents';

interface PlanningKitPanelProps {
  isOpen: boolean;
  onClose: () => void;
  kitItems: CartItem[];
  onUpdateQuantity: (productId: string, newQuantity: number) => void;
  onRemoveItem: (productId:string) => void;
  onSourceMaterials: (kit: CartItem[]) => void;
  onEmailKit: (items: CartItem[]) => void;
  selectedVideo?: Video | null;
  trackEvent?: (eventName: string, props: any) => void;
}

const formatMoney = (m: Money) => `$${m.amount.toFixed(2)}`;

const PlanningKitPanel: React.FC<PlanningKitPanelProps> = ({ 
    isOpen, onClose, kitItems, onUpdateQuantity, onRemoveItem, onSourceMaterials, onEmailKit, selectedVideo, trackEvent 
}) => {
  const [isGeneratingSheet, setIsGeneratingSheet] = useState(false);

  const subtotal = kitItems.reduce((acc, item) => {
    return acc + (item.price.amount * item.quantity);
  }, 0);

  const handleGenerateBuildSheet = () => {
    setIsGeneratingSheet(true);
    if (trackEvent) trackEvent('generate_build_sheet', { itemCount: kitItems.length, subtotal });
    
    setTimeout(() => {
        const printWindow = window.open('', '', 'height=800,width=800');
        if (printWindow) {
            const title = selectedVideo?.title || "Watch1Do1 Project";
            printWindow.document.write(`
              <html>
                <head>
                  <title>Planning Kit - ${title}</title>
                  <style>
                    body { font-family: sans-serif; padding: 40px; color: #000; }
                    .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 30px; }
                    .title { font-size: 24px; font-weight: 900; }
                    .checklist { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    .checklist th { text-align: left; font-size: 10px; text-transform: uppercase; border-bottom: 1px solid #000; padding: 10px; }
                    .checklist td { padding: 10px; font-size: 12px; border-bottom: 1px solid #eee; }
                    .total { text-align: right; margin-top: 30px; font-size: 20px; font-weight: 900; }
                  </style>
                </head>
                <body>
                  <div class="header"><div class="title">WATCH1DO1 PLANNING KIT</div><div>${title}</div></div>
                  <table class="checklist">
                    <thead><tr><th>Qty</th><th>Item</th><th>Retailer</th><th>Price</th></tr></thead>
                    <tbody>
                      ${kitItems.map(item => `
                        <tr>
                          <td>${item.quantity}x</td>
                          <td><strong>${item.name}</strong></td>
                          <td>${item.retailer}</td>
                          <td>${formatMoney(item.price)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                  <div class="total">Estimated Kit Value: $${subtotal.toFixed(2)}</div>
                  <script>window.onload = function() { window.print(); window.close(); };</script>
                </body>
              </html>
            `);
            printWindow.document.close();
        }
        setIsGeneratingSheet(false);
    }, 1000);
  };

  return (
    <>
      <div className={`fixed inset-0 bg-black/60 z-70 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-slate-900 shadow-2xl z-[80] transform transition-transform duration-500 border-l border-slate-700/50 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-800/20">
            <div><h2 className="text-2xl font-black text-white tracking-tighter">Planning Kit</h2><p className="text-[10px] font-black text-slate-500 uppercase">Sourcing Hub</p></div>
            <div className="flex gap-2">
                {kitItems.length > 0 && (
                    <button onClick={handleGenerateBuildSheet} aria-label="Generate Manifest" className="p-3 text-slate-500 hover:text-[#7D8FED] transition-all">{isGeneratingSheet ? <RefreshCwIcon className="w-6 h-6 animate-spin" /> : <FileTextIcon className="w-6 h-6" />}</button>
                )}
                <button onClick={onClose} aria-label="Close kit" className="p-3 text-slate-500 hover:text-white transition-all"><CloseIcon className="w-6 h-6" /></button>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {kitItems.length > 0 ? (
                kitItems.map(item => (
                    <div key={item.id} className="flex flex-col bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 hover:border-[#7D8FED]/30 transition-all shadow-xl group">
                      <div className="flex items-start gap-4">
                        <img src={item.imageUrl} alt={item.name} className="w-16 h-16 object-cover rounded-xl" />
                        <div className="flex-grow min-w-0">
                            <div className="flex justify-between items-start">
                                <div className="min-w-0 pr-6 relative">
                                    <p className="text-xs font-black text-white truncate">{item.name}</p>
                                    {item.isCreatorDeclared && (
                                        <span className="text-[7px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 mt-1 inline-block">Creator Declared</span>
                                    )}
                                    <a 
                                      href={item.purchaseUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="absolute -right-1 top-0 p-1 text-slate-500 hover:text-[#7D8FED] transition-colors"
                                      title="View Product"
                                    >
                                      <ExternalLinkIcon className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                                <button onClick={() => onRemoveItem(item.id)} aria-label="Remove item" className="text-slate-600 hover:text-rose-500 p-1 transition-colors flex-shrink-0"><TrashIcon className="w-3.5 h-3.5" /></button>
                            </div>
                            <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">{item.retailer}</p>
                            <div className="flex items-center justify-between mt-3">
                                <p className="text-sm font-black text-[#7D8FED]">{formatMoney(item.price)}</p>
                                <div className="flex items-center bg-slate-900 rounded-lg p-0.5">
                                    <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} className="p-1 text-slate-500 hover:text-white" aria-label="Decrease quantity"><MinusIcon className="w-3 h-3" /></button>
                                    <span className="font-black text-[10px] w-6 text-center text-white">{item.quantity}</span>
                                    <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="p-1 text-slate-500 hover:text-white" aria-label="Increase quantity"><PlusIcon className="w-3 h-3" /></button>
                                </div>
                            </div>
                        </div>
                      </div>
                    </div>
                ))
            ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                    <ShoppingCartIcon className="w-16 h-16 mb-4" />
                    <p className="font-black uppercase text-[10px] tracking-widest">Kit is Neutral</p>
                </div>
            )}
          </div>

          {kitItems.length > 0 && (
            <div className="p-8 border-t border-slate-800 bg-slate-800/40 backdrop-blur-xl">
              <div className="flex justify-between items-end mb-8">
                <div><span className="text-[10px] font-black uppercase text-slate-500">Estimated Kit Value</span><p className="text-4xl font-black text-white tracking-tighter">${subtotal.toFixed(2)}</p></div>
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded">Affiliate Routing Active</span>
              </div>
              <button onClick={() => onSourceMaterials(kitItems)} className="w-full font-black py-5 rounded-2xl shadow-xl transition-all uppercase tracking-[0.2em] text-xs hover:scale-[1.02] bg-[#7D8FED] text-white">
                Source Materials
              </button>
              <div className="mt-4 text-center">
                  <button 
                    onClick={() => { onClose(); (window as any).triggerSupport(); }}
                    className="text-[9px] font-black uppercase text-slate-500 hover:text-rose-400 transition-colors tracking-widest flex items-center justify-center gap-1.5 mx-auto"
                  >
                    Help improve the AI? Support the Beta <SparkleIcon className="w-3 h-3 text-rose-500" />
                  </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PlanningKitPanel;
