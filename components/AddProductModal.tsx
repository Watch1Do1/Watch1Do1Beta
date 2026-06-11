import React, { useState } from 'react';
import { CloseIcon, SparkleIcon, RefreshCwIcon, LinkIcon, CheckCircleIcon } from './IconComponents';
import { Product, ProjectCategory } from '../types';
import { asMoney } from '../services/geminiService';

interface AddProductModalProps {
  onClose: () => void;
  onAddProduct: (product: Product) => void;
  category?: ProjectCategory;
}

const AddProductModal: React.FC<AddProductModalProps> = ({ onClose, onAddProduct, category }) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'url'>('manual');
  
  // Manual Input States
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [retailer, setRetailer] = useState('');
  const [description, setDescription] = useState('');
  const [purchaseUrl, setPurchaseUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [evaluation, setEvaluation] = useState('');
  
  // URL Import States
  const [targetUrl, setTargetUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleUrlAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim()) return;
    
    setIsAnalyzing(true);
    setError('');
    setSuccessMsg('');
    
    try {
      // Calls the real-time Gemini URL Crawler / Scraper endpoint
      const res = await fetch('/api/ai/products/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, category })
      });
      
      if (!res.ok) {
        throw new Error('AI gateway was unable to extract layout from this URL.');
      }
      
      const products: Product[] = await res.json();
      
      if (products && products.length > 0) {
        const item = products[0];
        // Populate the manual input form with extracted telemetry
        setName(item.name || '');
        setPrice(item.price ? `${item.price.amount}` : '');
        setRetailer(item.retailer || 'Unknown');
        setDescription(item.description || '');
        setPurchaseUrl(targetUrl);
        setImageUrl(item.imageUrl || '');
        setEvaluation(item.evaluation || 'Extracted via Vision AI.');
        
        setActiveTab('manual');
        setSuccessMsg('AI Analysis Successful! Switched to draft review.');
      } else {
        throw new Error('No physical materials or tools detected on that page by Gemini.');
      }
    } catch (err: any) {
      setError(err.message || 'URL ingestion timed out. Please enter details manually.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Product signature designation is required.');
      return;
    }

    const uniqueId = `manual_${name.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`;
    const cleanImageUrl = imageUrl.trim() || `https://picsum.photos/seed/${encodeURIComponent(name)}/400/400`;
    const cleanPurchaseUrl = purchaseUrl.trim() || `https://www.google.com/search?q=${encodeURIComponent(name)}`;
    const cleanRetailer = retailer.trim() || 'Direct Store';

    const cleanProduct: Product = {
      id: uniqueId,
      name: name.trim(),
      price: asMoney(price),
      description: description.trim() || 'Custom provided project kit item.',
      imageUrl: cleanImageUrl,
      retailer: cleanRetailer,
      purchaseUrl: cleanPurchaseUrl,
      evaluation: evaluation.trim() || 'Manual custom curation.',
      isPartnerProduct: false,
      isCreatorDeclared: true,
      sourceType: 'manual',
    };

    onAddProduct(cleanProduct);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[130] p-4 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-lg border border-slate-700 transform transition-all duration-300 scale-95 animate-scale-in my-8">
        <div className="relative p-8 sm:p-10">
          <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-all p-2 hover:rotate-90">
            <CloseIcon className="w-6 h-6" />
          </button>
          
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#7D8FED]/10 mb-4 border border-[#7D8FED]/20">
              <SparkleIcon className="w-8 h-8 text-[#7D8FED]" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Expand Sourcing Kit</h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Incorporate custom materials & tools</p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-slate-900/60 p-1 rounded-2xl border border-slate-700/50 mb-6">
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'manual' ? 'bg-[#7D8FED] text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Manual Splicing
            </button>
            <button
              onClick={() => setActiveTab('url')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'url' ? 'bg-[#7D8FED] text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              AI URL Import (RAG)
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl mb-6">
               <p className="text-[10px] font-black text-red-400 uppercase tracking-widest text-center">{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl mb-6 flex items-center justify-center gap-2">
               <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
               <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest text-center">{successMsg}</p>
            </div>
          )}

          {/* TAB 1: MANUAL SPLICING */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Tool Designation *</label>
                  <input
                    type="text"
                    placeholder="e.g. DeWalt Brushless Drill"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#7D8FED] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Est. Price</label>
                  <input
                    type="text"
                    placeholder="e.g. $99.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#7D8FED] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Brand or Retailer</label>
                  <input
                    type="text"
                    placeholder="e.g. Amazon, Home Depot"
                    value={retailer}
                    onChange={(e) => setRetailer(e.target.value)}
                    className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#7D8FED] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Thumbnail Image URL</label>
                  <input
                    type="url"
                    placeholder="Provide image link or leave empty"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#7D8FED] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Sourcing or Affiliate Redirect URL</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"><LinkIcon className="w-4 h-4" /></span>
                  <input
                    type="url"
                    placeholder="e.g. https://amazon.com/dp/..."
                    value={purchaseUrl}
                    onChange={(e) => setPurchaseUrl(e.target.value)}
                    className="w-full p-4 pl-12 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#7D8FED] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Maker Guide Context</label>
                <textarea
                  placeholder="Explain why this item is optimal for the project..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#7D8FED] transition-all"
                  rows={2}
                />
              </div>

              {evaluation && (
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Specs & Evaluation (AI Output)</label>
                  <input
                    type="text"
                    value={evaluation}
                    onChange={(e) => setEvaluation(e.target.value)}
                    className="w-full p-4 bg-slate-950 border border-slate-700/50 rounded-xl text-slate-300 text-xs focus:outline-none"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-[#7D8FED] text-white font-black py-5 px-4 rounded-2xl hover:bg-[#6b7ae6] shadow-lg shadow-[#7D8FED]/25 transition-all duration-200 uppercase tracking-[0.25em] text-xs mt-3 flex items-center justify-center gap-2"
              >
                <CheckCircleIcon className="w-4 h-4" />
                Interlink Custom Tool
              </button>
            </form>
          )}

          {/* TAB 2: AI URL IMPORT  */}
          {activeTab === 'url' && (
            <form onSubmit={handleUrlAnalyze} className="space-y-6">
              <div className="bg-[#7D8FED]/5 border border-[#7D8FED]/20 rounded-2xl p-5 flex items-start gap-4">
                 <SparkleIcon className="w-5 h-5 text-[#7D8FED] flex-shrink-0 mt-0.5 animate-pulse" />
                 <div>
                    <p className="text-[10px] font-black text-[#7D8FED] uppercase tracking-widest mb-1">Dynamic RAG Crawler</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                       Paste a product redirect link from <span className="text-white font-bold">Amazon</span>, <span className="text-white font-bold">Shopify</span>, or any retailer. Gemini will scan and structure the specs, pricing, and visual thumbnails automatically.
                    </p>
                 </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Merchant Product URL</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"><LinkIcon className="w-4 h-4" /></span>
                  <input
                    type="url"
                    placeholder="https://www.amazon.com/dp/B00XP..."
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    className="w-full p-4 pl-12 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#7D8FED] transition-all"
                    required
                    disabled={isAnalyzing}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAnalyzing || !targetUrl.trim()}
                className="w-full bg-[#7D8FED] disabled:bg-slate-700 disabled:opacity-35 text-white font-black py-5 px-4 rounded-2xl hover:bg-[#6b7ae6] shadow-lg shadow-[#7D8FED]/25 transition-all duration-200 uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3"
              >
                {isAnalyzing ? <RefreshCwIcon className="w-4 h-4 animate-spin" /> : <SparkleIcon className="w-4 h-4" />}
                {isAnalyzing ? 'Analyzing Product Layout via Gemini...' : 'Extract Sourcing Data with AI'}
              </button>
            </form>
          )}
        </div>
      </div>
      <style>{`
        @keyframes scale-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in { animation: scale-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default AddProductModal;
