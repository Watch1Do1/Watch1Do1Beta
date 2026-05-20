
import React, { useState, useEffect } from 'react';
import { Product, CartItem, User, Money } from '../types';
import { TrashIcon, SparkleIcon, ExternalLinkIcon, CheckCircleIcon, RefreshCwIcon, ShoppingCartIcon, LightBulbIcon, ShieldIcon, LinkIcon, EyeIcon, XCircleIcon, PlusIcon, PencilIcon } from './IconComponents';

interface ProductCardProps {
  product: Product;
  viewMode?: 'shopper' | 'curator' | 'maker';
  isEditing?: boolean;
  isRevalidating?: boolean;
  onRemove?: (productId: string) => void;
  onAddToKit?: (product: Product) => void;
  onUpdateProduct?: (productId: string, updates: Partial<Product>) => void;
  planningKit?: CartItem[];
  trackEvent?: (eventName: string, props: any) => void;
  videoId?: number;
  currentUser?: User | null;
}

const formatPrice = (m: Money) => `$${m.amount.toFixed(2)}`;

const ProductCard: React.FC<ProductCardProps> = ({ 
    product, 
    viewMode = 'shopper',
    isEditing = false, 
    isRevalidating = false,
    onRemove, 
    onAddToKit, 
    onUpdateProduct,
    planningKit = [], 
    trackEvent, 
    videoId,
    currentUser
}) => {
  const [justAdded, setJustAdded] = useState(false);
  const [forceShowOverlay, setForceShowOverlay] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  
  const [editName, setEditName] = useState(product.name);
  const [editPrice, setEditPrice] = useState(product.price.amount.toString());
  const [editImageUrl, setEditImageUrl] = useState(product.imageUrl);
  const [editAffiliateUrl, setEditAffiliateUrl] = useState(product.creatorAffiliateUrl || product.purchaseUrl || '');
  const [editDescription, setEditDescription] = useState(product.description || '');

  useEffect(() => {
    setEditName(product.name);
    setEditPrice(product.price.amount.toString());
    setEditImageUrl(product.imageUrl);
    setEditAffiliateUrl(product.creatorAffiliateUrl || product.purchaseUrl || '');
    setEditDescription(product.description || '');
  }, [product]);

  const gamificationEnabled = currentUser?.gamificationEnabled ?? true;

  const kitItem = planningKit.find(item => item.id === product.id);
  const isInKit = !!kitItem;
  const kitQuantity = kitItem?.quantity || 0;
  const displayInKit = isInKit || justAdded;

  const handleAddToKitClick = () => {
    if (!onAddToKit) return;
    onAddToKit(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  const handleLinkClick = () => {
    if (trackEvent && product.purchaseUrl !== '#') {
        const isEbay = product.retailer?.toLowerCase().includes('ebay');
        trackEvent('source_redirect_click', { 
            productName: product.name, 
            videoId,
            retailer: product.retailer || 'Unknown',
            merchantType: product.merchantType
        });
    }
  };

  const isEbay = product.retailer?.toLowerCase().includes('ebay');
  const isMarketplaceCapable = product.checkoutMode === 'platform';
  const isCreatorDeclared = product.isCreatorDeclared;

  const purchaseUrl = (isCreatorDeclared && product.creatorAffiliateUrl) ? product.creatorAffiliateUrl : product.purchaseUrl;

  const getCardStyles = () => {
      if (isCreatorDeclared) return 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500 shadow-xl';
      if (isMarketplaceCapable) return 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500 shadow-xl';
      if (isEbay) return 'bg-slate-800/80 border-[#E53238]/20 hover:border-[#E53238] shadow-xl';
      return 'bg-slate-800 border-slate-700/50 hover:border-[#7D8FED]';
  };

  const hasPriceShift = product.lastCheckedPrice && product.lastCheckedPrice.amount !== product.price.amount;

  return (
    <div 
        className={`rounded-2xl overflow-hidden p-3 border transition-all duration-500 relative group ${isRevalidating ? 'opacity-70 scale-[0.98]' : ''} ${getCardStyles()}`}
        role="article"
    >
      {/* HOVER OVERLAY: Detailed reasoning, technical specs, and reviews */}
      <div 
        className={`absolute inset-0 z-[60] transition-all duration-300 flex flex-col bg-slate-900/98 backdrop-blur-md p-5 border-2 border-[#7D8FED]/40 rounded-2xl ${
            forceShowOverlay || 'group-hover:opacity-100 group-hover:pointer-events-auto' 
        } ${forceShowOverlay ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
          <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {gamificationEnabled && <SparkleIcon className="w-4 h-4 text-[#7D8FED]" />}
                <span className="text-[9px] font-black text-[#7D8FED] uppercase tracking-[0.2em]">{gamificationEnabled ? 'Build Reasoning' : 'Technical Intelligence'}</span>
              </div>
              {forceShowOverlay && (
                  <button onClick={() => setForceShowOverlay(false)} className="p-1 text-slate-500 hover:text-white">
                      <XCircleIcon className="w-5 h-5" />
                  </button>
              )}
          </div>
          
          <div className="space-y-4 flex-grow overflow-y-auto custom-scrollbar">
              <p className="text-sm text-white font-bold leading-relaxed">
                  {product.evaluation || "Precision material matched via visual frames and build specifications."}
              </p>
              
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Hardware Blueprint:</p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {product.technicalSpecs || product.description || "Identified as a critical build dependency based on visual telemetry."}
                  </p>
              </div>

              {product.reviewsUrl && product.reviewsUrl !== '#' && (
                  <a 
                    href={product.reviewsUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#7D8FED]/20 rounded-lg text-[9px] font-black uppercase text-[#7D8FED] hover:bg-[#7D8FED]/30 transition-all"
                  >
                      <ExternalLinkIcon className="w-3 h-3" /> External Reviews & Ratings
                  </a>
              )}
          </div>

          <div className="mt-auto flex items-center justify-between border-t border-slate-800 pt-3 flex-shrink-0">
              <div className="flex flex-col">
                  <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Source Authenticity</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Verified Protocol</span>
              </div>
              <button 
                  onClick={() => setForceShowOverlay(false)}
                  className="w-9 h-9 rounded-xl bg-[#7D8FED]/20 flex items-center justify-center border border-[#7D8FED]/40 text-[#7D8FED]"
              >
                  <CheckCircleIcon className="w-5 h-5" />
              </button>
          </div>
      </div>

      <div className="flex items-start space-x-4">
        <div className="relative flex-shrink-0">
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl shadow-sm transition-transform duration-500 group-hover:scale-105" 
            />
            {isMarketplaceCapable && (
                <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 p-1.5 rounded-full border-2 border-slate-900 shadow-lg" title="Marketplace Capable">
                    <ShieldIcon className="w-2.5 h-2.5 text-white" />
                </div>
            )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            {isRevalidating ? (
                <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 uppercase animate-pulse">Checking Market...</span>
            ) : isCreatorDeclared ? (
                <span className="text-[8px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-widest">Creator Declared</span>
            ) : isMarketplaceCapable ? (
                <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-widest">Marketplace Ready</span>
            ) : (
                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border uppercase tracking-tighter ${isEbay ? 'text-[#E53238] bg-[#E53238]/10 border-[#E53238]/20' : 'text-slate-400 bg-slate-700/30 border-slate-700'}`}>
                    {product.retailer || 'Marketplace'}
                </span>
            )}
            {hasPriceShift && !isRevalidating && (
                <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 uppercase">Market Shift</span>
            )}
          </div>
          
          <p className="text-sm font-bold text-white leading-tight mb-1.5">{product.name}</p>
          <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight mb-2 hover:line-clamp-none transition-all">{product.description}</p>
          
          <div className="flex items-center justify-between mt-auto pt-1">
              <div className="flex flex-col">
                  <div className="flex items-baseline gap-2">
                    <p className={`text-base font-black leading-none ${isMarketplaceCapable ? 'text-emerald-400' : 'text-[#7D8FED]'}`}>{formatPrice(product.price)}</p>
                    {hasPriceShift && (
                        <p className="text-[10px] text-slate-600 line-through font-bold tracking-tighter">{formatPrice(product.lastCheckedPrice!)}</p>
                    )}
                  </div>
              </div>
              
              <div className="flex items-center gap-2 relative z-[70]">
                  <button 
                    onClick={() => setForceShowOverlay(!forceShowOverlay)}
                    className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-500 hover:text-amber-500 transition-all hover:border-amber-500/30"
                    title="Reveal Build Intelligence"
                  >
                      <LightBulbIcon className="w-5 h-5" />
                  </button>

                  {viewMode === 'curator' && onUpdateProduct && (
                       <button
                           onClick={() => setIsEditingDetails(!isEditingDetails)}
                           className={`px-4 h-10 rounded-xl border flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider transition-all ${
                               isEditingDetails 
                                   ? 'bg-amber-600 text-white border-amber-500' 
                                   : 'bg-slate-700/50 text-slate-300 border-slate-600 hover:bg-slate-705 hover:text-white'
                           }`}
                       >
                           <PencilIcon className="w-3.5 h-3.5" />
                           {isEditingDetails ? 'Cancel' : 'Edit Specs'}
                       </button>
                  )}

                  {viewMode !== 'curator' && (
                    <>
                        <a 
                            href={purchaseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={handleLinkClick}
                            className={`w-10 h-10 rounded-xl transition-all border flex items-center justify-center ${isCreatorDeclared ? 'bg-amber-500 text-slate-900 border-amber-500/30 hover:bg-amber-400' : isEbay ? 'bg-[#E53238] text-white border-[#E53238]/30 hover:bg-[#c42b30]' : 'bg-slate-700/50 text-slate-300 border-slate-600'}`}
                            aria-label={`View ${product.name} on ${product.retailer}`}
                        >
                            <ExternalLinkIcon className="w-4 h-4" />
                        </a>
                        <button 
                            onClick={handleAddToKitClick}
                            disabled={isRevalidating || product.stockStatus === 'out'}
                            className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center relative ${displayInKit ? 'bg-emerald-500 text-white shadow-xl' : 'bg-[#7D8FED] text-slate-900 hover:scale-105 shadow-lg shadow-[#7D8FED]/20'}`}
                            aria-label={displayInKit ? `${product.name} in kit` : `Add ${product.name} to kit`}
                        >
                            {displayInKit ? <CheckCircleIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
                            {displayInKit && kitQuantity > 1 && (
                                <span className="absolute -top-2 -right-2 bg-emerald-600 text-white text-[9px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-slate-900 shadow-xl">{kitQuantity}</span>
                            )}
                        </button>
                    </>
                  )}
              </div>
          </div>
        </div>
      </div>

       {isEditingDetails && onUpdateProduct && (
          <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-3.5 animate-scale-in">
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center gap-2">
                  <ShieldIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <p className="text-[10px] font-semibold text-slate-400 leading-tight">
                      <span className="font-black text-amber-400 uppercase tracking-wider block mb-0.5">Paid Creator Pro Editor</span>
                      Change title, price, or replace missing/incorrect pictures by pasting a direct image link below.
                  </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider ml-1">Product Title</label>
                      <input 
                          type="text" 
                          value={editName} 
                          onChange={(e) => setEditName(e.target.value)} 
                          className="w-full bg-slate-900 border border-slate-700/60 rounded-xl p-3 text-xs font-bold text-white focus:outline-none focus:border-[#7D8FED]" 
                          placeholder="E.g. specialized drill, soldering station..."
                      />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider ml-1">Price (USD)</label>
                      <input 
                          type="number" 
                          step="0.01" 
                          value={editPrice} 
                          onChange={(e) => setEditPrice(e.target.value)} 
                          className="w-full bg-slate-900 border border-slate-700/60 rounded-xl p-3 text-xs font-mono text-[#7D8FED] focus:outline-none focus:border-[#7D8FED]" 
                          placeholder="E.g. 49.99"
                      />
                  </div>
              </div>

              <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider ml-1">Product Image URL (Fix broken / random pictures)</label>
                  <input 
                      type="text" 
                      value={editImageUrl} 
                      onChange={(e) => setEditImageUrl(e.target.value)} 
                      className="w-full bg-slate-900 border border-slate-700/60 rounded-xl p-3 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-[#7D8FED]" 
                      placeholder="Paste clean direct image link"
                  />
                  <p className="text-[7px] text-slate-500 font-bold ml-1 uppercase tracking-tight">Paste any internet image URL ending in .png, .jpg, or .webp to upgrade this picture immediately</p>
              </div>

              <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-amber-500 tracking-wider ml-1 flex items-center gap-1.5">
                      Your Custom Affiliate / Purchase Link 
                  </label>
                  <input 
                      type="text" 
                      value={editAffiliateUrl} 
                      onChange={(e) => setEditAffiliateUrl(e.target.value)} 
                      className="w-full bg-[#f59e0b]/5 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-500" 
                      placeholder="E.g. https://amazon.com/dp/... or https://ebay.com/itm/..."
                  />
                  <p className="text-[7px] text-slate-500 font-bold ml-1 uppercase tracking-tight">When shoppers build your kit, they are automatically routed through your custom link!</p>
              </div>

              <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider ml-1">Product Description / Specs</label>
                  <textarea 
                      value={editDescription} 
                      onChange={(e) => setEditDescription(e.target.value)} 
                      rows={2} 
                      className="w-full bg-slate-900 border border-slate-700/60 rounded-xl p-3 text-xs text-slate-300 italic focus:outline-none focus:border-[#7D8FED]" 
                      placeholder="E.g. Essential tool for structural soldering and quick lead adjustments."
                  />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                  <button 
                      onClick={() => {
                          setEditName(product.name);
                          setEditPrice(product.price.amount.toString());
                          setEditImageUrl(product.imageUrl);
                          setEditAffiliateUrl(product.creatorAffiliateUrl || product.purchaseUrl || '');
                          setEditDescription(product.description || '');
                          setIsEditingDetails(false);
                      }} 
                      className="px-4 py-2 border border-slate-700 rounded-xl text-[8px] font-black uppercase tracking-wider text-slate-400 hover:text-white"
                  >
                      Cancel
                  </button>
                  <button 
                      onClick={() => {
                          if (onUpdateProduct) {
                              onUpdateProduct(product.id, {
                                  name: editName,
                                  price: { amount: parseFloat(editPrice) || 0, currency: product.price.currency },
                                  imageUrl: editImageUrl,
                                  creatorAffiliateUrl: editAffiliateUrl,
                                  purchaseUrl: editAffiliateUrl || product.purchaseUrl, // fall back to affiliate if we have one
                                  isCreatorDeclared: true,
                                  description: editDescription
                              });
                              setIsEditingDetails(false);
                          }
                      }} 
                      className="px-5 py-2 bg-[#7D8FED] hover:bg-[#6b7be6] text-white rounded-xl text-[8px] font-black uppercase tracking-widest shadow-lg"
                  >
                      Apply Specs
                  </button>
              </div>
          </div>
       )}

      {isEditing && onRemove && (
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(product.id); }}
          className="absolute top-2 right-2 p-2 bg-rose-600 text-white rounded-full opacity-100 sm:opacity-0 group-hover:opacity-100 hover:bg-rose-500 focus:opacity-100 transition-all shadow-lg z-[80] ring-2 ring-slate-900"
          aria-label={`Remove ${product.name}`}
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default React.memo(ProductCard);
