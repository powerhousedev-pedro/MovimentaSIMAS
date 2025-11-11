
import React from 'react';
import { UserIcon, ChatIcon, HistoryIcon, LogoutIcon } from './Icons';
import { View } from '../types';

interface HeaderProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onViewChange, onLogout }) => {
  const inactiveClass = "text-gray-500 hover:text-gray-200 transition-colors duration-300";
  const activeClass = "text-teal-400";

  return (
    <header className="fixed top-0 left-0 right-0 z-20 h-20 bg-[#0A0E1A]/80 backdrop-blur-lg border-b border-white/5">
      <div className="w-full h-full max-w-5xl mx-auto flex justify-between items-center relative px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <button onClick={() => onViewChange('profile')} className={currentView === 'profile' ? activeClass : inactiveClass} aria-label="Ver Perfil">
            <UserIcon className="h-7 w-7" />
          </button>
          <button onClick={() => onViewChange('history')} className={currentView === 'history' ? activeClass : inactiveClass} aria-label="Ver Histórico">
            <HistoryIcon className="h-7 w-7" />
          </button>
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
             <button onClick={() => onViewChange('swiping')} className="text-xl font-bold">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-teal-400">
                    <span className="font-bold">Movimenta</span>
                    <span className="font-light ml-1.5">SIMAS</span>
                </span>
            </button>
        </div>

        <div className="flex items-center gap-6">
          <button onClick={() => onViewChange('matches')} className={currentView === 'matches' ? activeClass : inactiveClass} aria-label="Ver Combinações">
            <ChatIcon className="h-7 w-7" />
          </button>
           <button onClick={onLogout} className={inactiveClass} aria-label="Sair">
            <LogoutIcon className="h-7 w-7" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;