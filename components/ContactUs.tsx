import React, { useState } from 'react';
import { ArrowLeftIcon, SendIcon, SparkleIcon } from './IconComponents';

interface ContactUsProps {
  onBack: () => void;
  trackEvent?: (name: string, props: any) => void;
}

const ContactUs: React.FC<ContactUsProps> = ({ onBack, trackEvent }) => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', subject: 'support', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackEvent) {
        trackEvent('contact_form_submission', { subject: formData.subject });
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
        <div className="container mx-auto px-4 py-24 text-center animate-fade-in max-w-2xl">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-emerald-500/10 mb-8 border border-emerald-500/20 shadow-xl shadow-emerald-500/10">
                <SendIcon className="w-10 h-10 text-emerald-500" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter mb-4">Transmission Received</h1>
            <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px] mb-8 max-w-sm mx-auto leading-relaxed">
              Our workshop team will review your inquiry and respond within 24-48 business hours.
            </p>
            <button 
              onClick={onBack} 
              className="px-10 py-5 bg-white text-slate-900 font-black rounded-2xl hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-xs"
            >
                Return to Workshop
            </button>
        </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl animate-fade-in">
      <button 
        onClick={onBack} 
        className="flex items-center gap-2 mb-10 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all group"
      >
        <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
        Back to Library
      </button>

      <div className="bg-slate-800 rounded-[2.5rem] p-10 md:p-14 border border-slate-700/50 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <SparkleIcon className="w-48 h-48 text-white" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-5 mb-12">
            <div className="p-4 bg-[#7D8FED]/10 rounded-2xl border border-[#7D8FED]/20">
              <SparkleIcon className="w-8 h-8 text-[#7D8FED]" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter">Workshop Support</h1>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Get in touch with the master makers</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Maker Name</label>
                      <input 
                          required
                          type="text" 
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-4 focus:ring-[#7D8FED]/10 focus:border-[#7D8FED] transition-all placeholder-slate-600 text-sm" 
                          placeholder="Your identity"
                      />
                  </div>
                  <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Secure Email</label>
                      <input 
                          required
                          type="email" 
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-4 focus:ring-[#7D8FED]/10 focus:border-[#7D8FED] transition-all placeholder-slate-600 text-sm" 
                          placeholder="maker@workshop.com"
                      />
                  </div>
              </div>

              <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Inquiry Vector</label>
                  <div className="relative">
                    <select 
                        value={formData.subject}
                        onChange={(e) => setFormData({...formData, subject: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-4 focus:ring-[#7D8FED]/10 focus:border-[#7D8FED] transition-all appearance-none cursor-pointer text-sm font-bold"
                    >
                        <option value="support">Technical Workshop Support</option>
                        <option value="partnership">Creator / Partner Program</option>
                        <option value="feedback">General Feedback</option>
                        <option value="legal">Legal / IP Inquiry</option>
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
              </div>

              <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Your Message</label>
                  <textarea 
                      required
                      rows={6}
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-4 focus:ring-[#7D8FED]/10 focus:border-[#7D8FED] transition-all placeholder-slate-600 text-sm resize-none" 
                      placeholder="Detail your request or feedback here..."
                  ></textarea>
              </div>

              <button 
                  type="submit"
                  className="w-full bg-[#7D8FED] text-white font-black py-5 rounded-2xl hover:bg-[#6b7ae6] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl shadow-[#7D8FED]/20 uppercase tracking-[0.2em] text-xs"
              >
                  <SendIcon className="w-5 h-5" /> Initialize Transmission
              </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;