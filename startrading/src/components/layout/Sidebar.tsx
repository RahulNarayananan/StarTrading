import React from 'react';
import { 
  LayoutGrid, 
  TrendingUp, 
  Shield, 
  Settings, 
  HelpCircle, 
  Search, 
  ShoppingBag, 
  Lock,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ isOpen, onToggle }: SidebarProps) => {
  const location = useLocation();

  const menuItems = [
    { icon: Search, label: 'Search', path: '/' },
    { icon: Lock, label: 'StarVault', path: '/vault' },
    { icon: TrendingUp, label: 'Forecasts', path: '/forecasts' },
    { icon: Calendar, label: 'Events', path: '/events' },
  ];

  const bottomItems = [
    { icon: Settings, label: 'Settings', path: '/settings' },
    { icon: HelpCircle, label: 'Help', path: '/help' },
  ];

  return (
    <>
      {/* Overlay - now always active when open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
          onClick={onToggle}
        />
      )}

      <aside 
        className={`fixed left-0 top-20 h-[calc(100vh-80px)] bg-white/60 backdrop-blur-2xl border-r border-white/50 flex flex-col py-6 z-40 transition-all duration-300 ease-in-out shadow-[10px_0_40px_rgba(0,0,0,0.04)] w-64 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 flex flex-col gap-2 px-4">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.label}
                to={item.path}
                onClick={onToggle}
                className={`flex items-center gap-4 p-3 rounded-xl transition-all group ${
                  isActive 
                    ? 'bg-[#ADA3E6] text-white shadow-lg shadow-[#ADA3E6]/20' 
                    : 'text-gray-500 hover:text-[#ADA3E6] hover:bg-white/60'
                }`}
              >
                <item.icon size={22} className="shrink-0" />
                <span className="text-sm font-bold tracking-tight whitespace-nowrap overflow-hidden">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 px-4">
          {bottomItems.map((item) => (
            <Link 
              key={item.label}
              to={item.path}
              onClick={onToggle}
              className="flex items-center gap-4 p-3 text-gray-500 hover:text-[#ADA3E6] hover:bg-white/60 rounded-xl transition-all"
            >
              <item.icon size={22} className="shrink-0" />
              <span className="text-sm font-bold tracking-tight whitespace-nowrap overflow-hidden">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </aside>
    </>
  );
};
