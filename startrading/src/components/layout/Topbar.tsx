import React, { useState } from 'react';
import { User, Menu, X, Search, Bell, Star } from 'lucide-react';
import { Button } from '../ui/Button';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';

interface TopbarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

const PokeballIcon = ({ isOpen }: { isOpen: boolean }) => (
  <motion.svg 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    animate={{ rotate: isOpen ? 180 : 0 }}
    transition={{ type: "spring", stiffness: 260, damping: 20 }}
    className="text-[#ADA3E6]"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
    <circle cx="12" cy="12" r="1" fill="white" />
  </motion.svg>
);

export const Topbar = ({ isSidebarOpen, onToggleSidebar }: TopbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search-results?q=${encodeURIComponent(query)}`);
    }
  };

  const showSearchBar = location.pathname !== '/' && !location.pathname.startsWith('/card/');

  return (
    <header className="fixed top-0 left-0 right-0 h-20 bg-white/40 backdrop-blur-2xl border-b border-white/50 flex items-center justify-between px-8 z-50 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-4">
        <button 
          onClick={onToggleSidebar}
          className="p-2 text-gray-500 hover:bg-[#F3F0FF] rounded-xl transition-all duration-300 group"
        >
          <PokeballIcon isOpen={isSidebarOpen} />
        </button>
        <Link to="/" className="text-2xl font-black text-[#ADA3E6] tracking-tight">StarTrading</Link>
      </div>

      <div className="flex items-center gap-3">
        {showSearchBar && (
          <form onSubmit={handleSearch} className="hidden md:flex items-center mr-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400 group-focus-within:text-[#ADA3E6] transition-colors" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search archives..."
                className="block w-64 pl-11 pr-4 py-2 bg-white/40 border border-white/40 rounded-2xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ADA3E6]/20 focus:bg-white/60 transition-all"
              />
            </div>
          </form>
        )}
        <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-white/40">
          <Bell size={20} />
        </Button>
        <Button variant="outline" size="icon" className="bg-white/50 backdrop-blur-sm border-white/30 rounded-full w-10 h-10">
          <User size={20} className="text-gray-600" />
        </Button>
      </div>
    </header>
  );
};
