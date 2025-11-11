
import React from 'react';
import { UserProfile } from '../types';
import { SwapIcon } from './Icons';

interface ConfirmSwapModalProps {
  matchedUser: UserProfile;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

const ConfirmSwapModal: React.FC<ConfirmSwapModalProps> = ({ matchedUser, onClose, onConfirm, isLoading }) => {
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-[#161B29] border border-white/10 rounded-2xl p-8 text-center relative w-11/12 max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
            <SwapIcon className="w-12 h-12 text-teal-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">
          Confirmar Interesse na Troca
        </h2>
        <p className="text-gray-300 mb-6 text-sm">
          Você está prestes a confirmar seu interesse na troca com <strong>{matchedUser.name}</strong>.
        </p>
        <p className="text-gray-300 mb-6 text-sm font-semibold">
          A solicitação formal para a gerência só será enviada quando a outra parte também confirmar.
        </p>
        
        <div className="flex flex-col space-y-3">
           <button 
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-bold py-3 px-6 rounded-full hover:from-indigo-600 hover:to-teal-600 transition-all disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Confirmando...' : 'Sim, Tenho Interesse'}
          </button>
          <button 
            onClick={onClose}
            disabled={isLoading}
            className="w-full bg-transparent text-gray-300 font-bold py-3 px-6 rounded-full hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmSwapModal;
