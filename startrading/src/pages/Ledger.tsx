import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Image as ImageIcon, Calendar, DollarSign, Award, ChevronRight, BookOpen, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { getCardImage, cn } from '../lib/utils';

interface LedgerEntry {
  id: string;
  name: string;
  date_of_purchase: string;
  cost: number;
  grade: string;
  image_url?: string;
}

const DEFAULT_ENTRIES: LedgerEntry[] = [
  {
    id: 'mewtwo-vstar-1',
    name: 'Mewtwo VSTAR (Secret)',
    date_of_purchase: '2023-11-15',
    cost: 85.50,
    grade: 'PSA 10',
    image_url: 'https://images.pokemontcg.io/pgo/79_hires.png'
  },
  {
    id: 'charizard-base-1',
    name: 'Charizard - Base Set (Shadowless)',
    date_of_purchase: '2024-01-10',
    cost: 850.00,
    grade: 'BGS 8.5',
    image_url: 'https://images.pokemontcg.io/base1/4_hires.png'
  },
  {
    id: 'rayquaza-vmax-1',
    name: 'Rayquaza VMAX',
    date_of_purchase: '2024-02-28',
    cost: 295.00,
    grade: 'Raw / NM',
    image_url: 'https://images.pokemontcg.io/swsh7/218_hires.png'
  }
];

export default function Ledger() {
  const [entries, setEntries] = useState<LedgerEntry[]>(() => {
    const saved = localStorage.getItem('star_trading_ledger');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Failed to parse ledger from local storage");
      }
    }
    return DEFAULT_ENTRIES;
  });

  const [selectedId, setSelectedId] = useState<string | null>(() => {
    // initialize selected ID with the first item of entries if available
    const saved = localStorage.getItem('star_trading_ledger');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed[0].id;
      } catch (e) {
        // ignore
      }
    }
    return DEFAULT_ENTRIES[0].id;
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    date_of_purchase: '',
    cost: '',
    grade: '',
    image_url: ''
  });

  // Save to localStorage when entries change
  useEffect(() => {
    localStorage.setItem('star_trading_ledger', JSON.stringify(entries));
  }, [entries]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    let finalImageUrl = formData.image_url.trim();

    if (!finalImageUrl) {
      const utilImg = getCardImage(formData.name);
      if (utilImg) {
        finalImageUrl = utilImg;
      } else {
        try {
          const res = await fetch('/search/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: formData.name })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.items && data.items.length > 0) {
              const itemWithImage = data.items.find((item: any) => item.image_url);
              if (itemWithImage) {
                finalImageUrl = itemWithImage.image_url;
              }
            }
          }
        } catch (err) {
          console.error("Auto fetch failed", err);
        }
      }
    }

    const newEntry: LedgerEntry = {
      id: Math.random().toString(36).substring(7),
      name: formData.name,
      date_of_purchase: formData.date_of_purchase,
      cost: parseFloat(formData.cost) || 0,
      grade: formData.grade,
      image_url: finalImageUrl !== '' ? finalImageUrl : undefined
    };
    
    const updated = [newEntry, ...entries];
    setEntries(updated);
    setSelectedId(newEntry.id);
    setShowAddModal(false);
    setFormData({ name: '', date_of_purchase: '', cost: '', grade: '', image_url: '' });
    setIsSubmitting(false);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    if (selectedId === id) {
      setSelectedId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const selectedEntry = entries.find(e => e.id === selectedId) || null;

  const displayImage = selectedEntry 
    ? (selectedEntry.image_url || getCardImage(selectedEntry.name) || "https://images.pokemontcg.io/swsh3/20_hires.png")
    : null;

  return (
    <div className="pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-6xl font-black tracking-tight text-[#1A1A1A] flex items-center gap-4">
          <BookOpen className="w-16 h-16 text-[#ADA3E6]" />
          Asset Ledger
        </h1>
        <p className="text-lg font-bold text-gray-400 mt-2">Document your personal collection, acquisition date, and graded status.</p>
      </div>

      {/* Book Layout */}
      <div className="relative w-full min-h-[750px] bg-white/40 backdrop-blur-3xl border border-white/60 rounded-[3rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] flex flex-col md:flex-row overflow-hidden">
        
        {/* Central Spine line (visible on md+) */}
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent shadow-[-1px_0_2px_rgba(0,0,0,0.05)] z-10" />

        {/* --- Left Pane: Card Details --- */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col relative z-0">
          {selectedEntry ? (
            <motion.div 
              key={selectedEntry.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="px-4 py-1.5 bg-[#F3F0FF] border border-[#ADA3E6]/20 rounded-full text-xs font-black tracking-[0.15em] uppercase text-[#ADA3E6] mb-3 inline-block">
                    PROVENANCE RECORD
                  </span>
                  <h2 className="text-4xl font-black text-[#1A1A1A] leading-none mb-2">{selectedEntry.name}</h2>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleDelete(selectedEntry.id)}
                    className="w-14 h-14 bg-rose-50 hover:bg-rose-100 rounded-2xl flex items-center justify-center border border-rose-100 text-rose-500 transition-colors shrink-0 shadow-sm"
                    title="Delete Record"
                  >
                    <Trash2 size={24} />
                  </button>
                  <div className="w-14 h-14 bg-[#ADA3E6]/10 rounded-2xl flex items-center justify-center border border-[#ADA3E6]/20 text-[#ADA3E6] font-black text-xl shadow-sm shrink-0">
                    {entries.findIndex(e => e.id === selectedId) + 1}
                  </div>
                </div>
              </div>

              {/* Main Image Display */}
              <div className="flex-1 w-full bg-gradient-to-br from-white/50 to-white/20 border-2 border-white rounded-[2.5rem] shadow-inner mb-8 flex items-center justify-center p-8 relative group overflow-hidden">
                <div className="absolute inset-0 bg-[#ADA3E6]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <img 
                  src={displayImage!} 
                  alt={selectedEntry.name}
                  className="w-full h-full object-contain filter drop-shadow-2xl hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                  onError={(e) => { e.currentTarget.src = "https://images.pokemontcg.io/swsh3/20_hires.png" }}
                />
              </div>

              {/* Stats Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/60 p-6 rounded-3xl border border-white/50 shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-500">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Purchased</label>
                    <p className="text-lg font-bold text-[#1A1A1A] mt-0.5">{selectedEntry.date_of_purchase}</p>
                  </div>
                </div>
                <div className="bg-white/60 p-6 rounded-3xl border border-white/50 shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0 text-orange-500">
                    <Award size={20} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Grade</label>
                    <p className="text-lg font-bold text-[#1A1A1A] mt-0.5">{selectedEntry.grade}</p>
                  </div>
                </div>
                <div className="col-span-2 bg-[#F3F0FF]/50 p-6 rounded-3xl border border-[#ADA3E6]/20 shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#ADA3E6]/20 flex items-center justify-center flex-shrink-0 text-[#ADA3E6]">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Total Cost Basis</label>
                    <p className="text-2xl font-black text-[#1A1A1A] mt-0.5">${selectedEntry.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>

            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
              <BookOpen size={48} className="opacity-20" />
              <p className="font-bold text-center">Your ledger is empty.<br/>Add a card to begin.</p>
            </div>
          )}
        </div>

        {/* --- Right Pane: List & Add --- */}
        <div className="w-full md:w-1/2 bg-gray-50/50 md:border-l border-white/40 flex flex-col z-0">
          <div className="p-8 border-b border-gray-200/50 flex justify-between items-center backdrop-blur-xl bg-white/30 sticky top-0 z-10">
            <h3 className="text-2xl font-black text-[#1A1A1A]">Ledger Index</h3>
            <Button 
              onClick={() => setShowAddModal(true)}
              className="bg-[#ADA3E6] hover:bg-[#9B8FE0] rounded-xl px-5 py-4 h-auto flex items-center gap-2 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-[#ADA3E6]/20 transition-all active:scale-95"
            >
              <Plus size={16} />
              Add Record
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-4">
            {entries.map((entry, index) => {
              const isActive = selectedId === entry.id;
              const thumb = entry.image_url || getCardImage(entry.name) || "https://images.pokemontcg.io/swsh3/20_hires.png";
              return (
                <button
                  key={entry.id}
                  onClick={() => setSelectedId(entry.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-3xl flex items-center gap-5 transition-all duration-300 border",
                    isActive 
                      ? "bg-white border-[#ADA3E6] shadow-xl shadow-[#ADA3E6]/10 scale-[1.02]" 
                      : "bg-white/40 border-transparent hover:bg-white/80 hover:scale-[1.01]"
                  )}
                >
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    <img src={thumb} className="w-full h-full object-contain filter drop-shadow-sm p-1" alt={entry.name} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Entry No. {entries.length - index}</p>
                    <h4 className={cn("text-lg font-black leading-tight", isActive ? "text-[#ADA3E6]" : "text-[#1A1A1A]")}>
                      {entry.name}
                    </h4>
                  </div>
                  <div className={cn("transition-transform", isActive ? "translate-x-1" : "")}>
                    <ChevronRight className={isActive ? "text-[#ADA3E6]" : "text-gray-300"} size={20} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden p-8 border border-white/40"
            >
              <button 
                onClick={() => setShowAddModal(false)}
                className="absolute top-6 right-6 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
              
              <h2 className="text-3xl font-black text-[#1A1A1A] mb-2">New Record</h2>
              <p className="text-sm font-bold text-gray-400 mb-8">Add a new collectible to your personal ledger.</p>

              <form onSubmit={handleAdd} className="space-y-5">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Card Name</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Charizard Base Set"
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-medium text-[#1A1A1A] outline-none focus:border-[#ADA3E6] focus:ring-4 focus:ring-[#ADA3E6]/10 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Purchase Date</label>
                    <input 
                      type="date" 
                      required 
                      value={formData.date_of_purchase}
                      onChange={(e) => setFormData({...formData, date_of_purchase: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-medium text-[#1A1A1A] outline-none focus:border-[#ADA3E6] focus:ring-4 focus:ring-[#ADA3E6]/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Cost ($)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      required 
                      value={formData.cost}
                      onChange={(e) => setFormData({...formData, cost: e.target.value})}
                      placeholder="0.00"
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-medium text-[#1A1A1A] outline-none focus:border-[#ADA3E6] focus:ring-4 focus:ring-[#ADA3E6]/10 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Grade</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.grade}
                    onChange={(e) => setFormData({...formData, grade: e.target.value})}
                    placeholder="e.g. PSA 10, Raw, BGS 9.5"
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-medium text-[#1A1A1A] outline-none focus:border-[#ADA3E6] focus:ring-4 focus:ring-[#ADA3E6]/10 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Image URL (Optional)</label>
                  <div className="flex gap-3">
                    <div className="w-14 items-center justify-center flex bg-gray-100 rounded-xl text-gray-400">
                      <ImageIcon size={20} />
                    </div>
                    <input 
                      type="url" 
                      value={formData.image_url}
                      onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                      placeholder="https://..."
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-medium text-[#1A1A1A] outline-none focus:border-[#ADA3E6] focus:ring-4 focus:ring-[#ADA3E6]/10 transition-all"
                    />
                  </div>
                  <p className="text-xs font-medium text-gray-400 mt-2 ml-1">If blank, we will try to fetch an image automatically.</p>
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full mt-4 bg-black hover:bg-black/80 rounded-2xl py-5 text-white font-black text-sm uppercase tracking-widest shadow-xl transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Fetching Data..." : "Save Entry"}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
