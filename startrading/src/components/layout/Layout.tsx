import React, { useState } from 'react';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { motion } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen bg-[#F8F9FD] font-sans text-[#1A1A1A] relative overflow-x-hidden">
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-200/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-200/40 rounded-full blur-[120px]" />
        <div className="absolute top-[30%] right-[20%] w-[30%] h-[30%] bg-indigo-100/30 rounded-full blur-[100px]" />
      </div>

      <Topbar isSidebarOpen={isSidebarOpen} onToggleSidebar={toggleSidebar} />
      
      <div className="flex pt-20">
        <Sidebar 
          isOpen={isSidebarOpen} 
          onToggle={toggleSidebar} 
        />
        
        <motion.main 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 transition-all duration-300 ease-in-out"
        >
          <div className="max-w-7xl mx-auto p-4 lg:p-8">
            {children}
          </div>
        </motion.main>
      </div>
    </div>
  );
};
