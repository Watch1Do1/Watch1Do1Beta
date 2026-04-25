
import React, { useState } from 'react';
import { CloseIcon, SparkleIcon } from './IconComponents';

interface AddProductModalProps {
  onClose: () => void;
  onAddProduct: (product: { name: string; price: string; description: string }) => void;
}

const AddProductModal: React.FC<AddProductModalProps> = ({ onClose, onAddProduct }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !description) {
      setError('All fields are required.');
      return;
    }
    setError('');
    onAddProduct({ name, price, description });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md border border-slate-700 transform transition-all duration-300 scale-95 animate-scale-in">
        <div className="relative p-8">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-2">
            <CloseIcon className="w-6 h-6" />
          </button>
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#7D8FED]/10 mb-4 border border-[#7D8FED]/20">
              <SparkleIcon className="w-8 h-8 text-[#7D8FED]" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Add Project Product</h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Manual Tool Entry</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Product Name</label>
              <input
                type="text"
                placeholder="e.g. DeWalt Brushless Drill"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#7D8FED] transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Est. Price</label>
              <input
                type="text"
                placeholder="$99.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#7D8FED] transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Description</label>
              <textarea
                placeholder="Why is this product needed?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#7D8FED] transition-all"
                rows={3}
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                 <p className="text-[10px] font-black text-red-400 uppercase tracking-widest text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[#7D8FED] text-white font-black py-4 px-4 rounded-xl hover:bg-[#6b7ae6] shadow-lg shadow-[#7D8FED]/20 transition-all duration-200 uppercase tracking-[0.2em] text-xs"
            >
              Confirm Tool Addition
            </button>
          </form>
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
