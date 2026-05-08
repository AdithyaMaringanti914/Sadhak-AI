import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, History, Settings, UserCircle, LogOut } from 'lucide-react';

const Sidebar: React.FC = () => {
  return (
    <div className="w-20 h-full bg-surface-light border-r border-white/5 flex flex-col items-center py-8 gap-8">
      <div className="w-10 h-10 rounded-xl bg-neon-gradient flex items-center justify-center shadow-neon">
        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>

      <nav className="flex-1 flex flex-col gap-4">
        <NavLink 
          to="/" 
          className={({ isActive }) => `p-3 rounded-xl transition-all duration-300 ${isActive ? 'bg-primary/20 text-primary shadow-neon' : 'text-white/30 hover:bg-white/5 hover:text-white'}`}
        >
          <LayoutDashboard size={24} />
        </NavLink>
        <NavLink 
          to="/logs" 
          className={({ isActive }) => `p-3 rounded-xl transition-all duration-300 ${isActive ? 'bg-secondary/20 text-secondary shadow-neon-purple' : 'text-white/30 hover:bg-white/5 hover:text-white'}`}
        >
          <History size={24} />
        </NavLink>
        <NavLink 
          to="/settings" 
          className={({ isActive }) => `p-3 rounded-xl transition-all duration-300 ${isActive ? 'bg-accent/20 text-accent shadow-neon' : 'text-white/30 hover:bg-white/5 hover:text-white'}`}
        >
          <Settings size={24} />
        </NavLink>
      </nav>

      <div className="flex flex-col gap-4 mt-auto">
        <div className="p-3 text-white/30 hover:text-white transition-colors cursor-pointer">
          <UserCircle size={24} />
        </div>
        <div className="p-3 text-red-400/50 hover:text-red-400 transition-colors cursor-pointer">
          <LogOut size={24} />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
