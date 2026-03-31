import React, { useState } from 'react';
import { Search as SearchIcon, ArrowRight, Command } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (query.trim()) {
      navigate(`/search-results?q=${encodeURIComponent(query)}`);
    }
  };

  const recentDiscoveries = [
    "Lugia V (Alt Art)",
    "Silver Tempest",
    "Holographic Energy",
    "1st Edition Charizard"
  ];

  return (
    <div className="relative min-h-[calc(100vh-100px)] flex flex-col items-center justify-center px-4">
      {/* ... existing card silhouettes ... */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, rotate: -15, y: 100 }}
          animate={{ opacity: 0.4, rotate: -12, y: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute top-[10%] left-[10%] w-64 h-96 border border-gray-200 rounded-2xl bg-white/30 backdrop-blur-sm shadow-sm"
        />
        <motion.div 
          initial={{ opacity: 0, rotate: 10, y: 100 }}
          animate={{ opacity: 0.4, rotate: 8, y: 0 }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
          className="absolute top-[20%] right-[10%] w-72 h-[450px] border border-gray-200 rounded-2xl bg-white/30 backdrop-blur-sm shadow-sm"
        />
        <motion.div 
          initial={{ opacity: 0, rotate: -25, y: 100 }}
          animate={{ opacity: 0.6, rotate: -20, y: 0 }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.4 }}
          className="absolute bottom-[-5%] left-[0%] w-56 h-80 border border-gray-200 rounded-2xl bg-white/40 backdrop-blur-sm shadow-md"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center mb-12 relative z-10"
      >
        <h1 className="text-7xl font-extrabold tracking-tight mb-4 text-[#1A1A1A]">
          Star<span className="text-[#ADA3E6]">Trading</span>
        </h1>
        <p className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase">
          Access the Global Card Archives
        </p>
      </motion.div>

      {/* Search Bar */}
      <motion.form 
        onSubmit={handleSearch}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="w-full max-w-2xl relative group z-10"
      >
        <div className="absolute inset-0 bg-[#ADA3E6]/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative flex items-center bg-white rounded-[2.5rem] p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <div className="pl-6 pr-4">
            <SearchIcon size={22} className="text-gray-400" />
          </div>
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Pokemon, Rarity, or Set..."
            className="flex-1 bg-transparent border-none outline-none text-lg text-gray-700 placeholder:text-gray-300 py-4"
          />
          <div className="flex items-center gap-3 pr-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-100 rounded-md text-[10px] font-bold text-gray-400">
              <Command size={10} />
              <span>K</span>
            </div>
            <Button type="submit" size="icon" className="w-12 h-12 bg-[#ADA3E6] hover:bg-[#9B8FE0]">
              <ArrowRight size={20} />
            </Button>
          </div>
        </div>
      </motion.form>

      {/* Recent Discoveries */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.6 }}
        className="mt-16 text-center relative z-10"
      >
        <p className="text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-6">
          Recent Discoveries
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {recentDiscoveries.map((item, index) => (
            <Button 
              key={index} 
              variant="secondary" 
              size="md"
              onClick={() => {
                setQuery(item);
                navigate(`/search-results?q=${encodeURIComponent(item)}`);
              }}
            >
              {item}
            </Button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
