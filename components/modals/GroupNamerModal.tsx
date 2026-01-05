"use client";

import { useState, useRef, useEffect } from "react";
import { useFlowStore } from "../../store/flowStore";

export default function GroupNamerModal() {
  const { namerModal, closeNamer, groupNodes } = useFlowStore();
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (namerModal?.isOpen) {
      setName("New Subflow");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [namerModal?.isOpen]);

  if (!namerModal?.isOpen) return null;

  const handleCreate = () => {
    if (name.trim()) {
      groupNodes(namerModal.nodeIds, name.trim());
      closeNamer();
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-indigo-950/40 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={closeNamer} 
      />
      
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-indigo-100 p-8 transform animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
               </svg>
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-800 tracking-tight">Name your Group</h2>
              <p className="text-gray-500 text-sm">Organize your subflow with a clear title</p>
            </div>
          </div>

          <div className="space-y-4">
             <div className="group">
                <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1.5 block">Group Name</label>
                <input
                  ref={inputRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-lg font-bold text-gray-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all"
                  placeholder="e.g. Authentication Flow"
                />
             </div>
          </div>

          <div className="flex gap-3">
             <button
               onClick={closeNamer}
               className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-all active:scale-95"
             >
               Cancel
             </button>
             <button
               onClick={handleCreate}
               className="flex-[2] px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-95 flex items-center justify-center gap-2"
             >
               <span>Create Group</span>
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
               </svg>
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
