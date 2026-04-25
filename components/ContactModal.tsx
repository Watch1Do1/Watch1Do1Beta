import React from 'react';
const ContactModal = ({ onClose }: any) => (
  <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
    <div className="bg-slate-800 p-8 rounded-3xl max-w-md w-full">
      <h2 className="text-2xl font-black mb-4">Contact Support</h2>
      <button onClick={onClose} className="w-full bg-[#7D8FED] py-4 rounded-xl font-bold">Close</button>
    </div>
  </div>
);
export default ContactModal;