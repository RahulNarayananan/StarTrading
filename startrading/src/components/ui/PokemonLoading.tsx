import React from 'react';
import { motion } from 'motion/react';

interface PokemonLoadingProps {
  query: string;
}

export const PokemonLoading = ({ query }: PokemonLoadingProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-10">
      <div className="relative">
        {/* Outer Glow */}
        <div className="absolute inset-0 bg-[#ADA3E6]/20 blur-[60px] rounded-full animate-pulse" />
        
        {/* Pokeball Animation */}
        <motion.div
          animate={{ 
            rotate: [0, -15, 15, -15, 15, 0],
            y: [0, -20, 0]
          }}
          transition={{ 
            rotate: { duration: 0.5, repeat: Infinity, repeatDelay: 1 },
            y: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
          }}
          className="relative w-32 h-32 md:w-40 md:h-40"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
            {/* Top Red Half */}
            <path d="M50 5 a45 45 0 0 1 45 45 h-90 a45 45 0 0 1 45 -45" fill="#EF4444" />
            {/* Bottom White Half */}
            <path d="M50 95 a45 45 0 0 0 45 -45 h-90 a45 45 0 0 0 45 45" fill="white" />
            {/* Center Black Line */}
            <rect x="5" y="47" width="90" height="6" fill="#1A1A1A" />
            {/* Center Circle Button Container */}
            <circle cx="50" cy="50" r="12" fill="#1A1A1A" />
            <circle cx="50" cy="50" r="8" fill="white" />
            <circle cx="50" cy="50" r="5" fill="white" className="animate-ping opacity-50" />
          </svg>
        </motion.div>
      </div>

      <div className="space-y-4 max-w-md">
        <motion.h3 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl md:text-3xl font-black text-[#1A1A1A] tracking-tight"
        >
          A wild <span className="text-[#ADA3E6]">'{query}'</span> appeared!
        </motion.h3>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">
            Extracting market data...
          </p>
          <div className="w-48 h-1.5 bg-gray-100 rounded-full mx-auto overflow-hidden">
            <motion.div 
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="w-1/2 h-full bg-[#ADA3E6] rounded-full"
            />
          </div>
        </motion.div>
        
        <p className="text-xs text-gray-400 italic">
          Please wait while our scraper navigates the global archives. 
          Catching the latest transactions takes a few moments!
        </p>
      </div>
    </div>
  );
};
