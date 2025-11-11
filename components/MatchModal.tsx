import React from 'react';
import { UserProfile } from '../types';
import { HeartIcon } from './Icons';

interface MatchModalProps {
  currentUser: UserProfile;
  matchedUser: UserProfile;
  onClose: () => void;
}

const MatchModal: React.FC<MatchModalProps> = ({ currentUser, matchedUser, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-[#161B29] border border-white/10 rounded-2xl p-8 text-center relative w-11/12 max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-teal-400 mb-4">
          Interesse Mútuo!
        </h2>
        <p className="text-gray-300 mb-6">
          Você e {matchedUser.name} são compatíveis. Inicie uma conversa!
        </p>
        <div className="flex justify-center items-center space-x-4">
          <img src={currentUser.imageUrl} alt="Você" className="w-24 h-24 rounded-full object-cover border-4 border-white"/>
          <HeartIcon className="w-10 h-10 text-teal-400 animate-pulse" />
          <div className="relative p-1 rounded-full bg-gradient-to-r from-indigo-500 to-teal-400">
            <img src={matchedUser.imageUrl} alt={matchedUser.name} className="w-24 h-24 rounded-full object-cover border-4 border-[#161B29]"/>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="mt-8 bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-bold py-3 px-6 rounded-full w-full hover:from-indigo-600 hover:to-teal-600 transition-all duration-300"
        >
          Continuar Buscando
        </button>
      </div>
    </div>
  );
};

export default MatchModal;