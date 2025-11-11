import React from 'react';
import { HeartIcon, XIcon } from './Icons';
import { SwipeDirection } from '../types';

interface SwipeButtonsProps {
  onSwipe: (direction: SwipeDirection) => void;
}

const SwipeButtons: React.FC<SwipeButtonsProps> = ({ onSwipe }) => {
  return (
    <div className="flex justify-center items-center gap-8">
      <button
        onClick={() => onSwipe('left')}
        className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-4 shadow-lg hover:bg-white/20 transform hover:scale-110 transition-all duration-300 ease-in-out"
        aria-label="Pular vaga"
      >
        <XIcon className="h-8 w-8 text-rose-400" />
      </button>
      <button
        onClick={() => onSwipe('right')}
        className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-6 shadow-lg hover:bg-white/20 transform hover:scale-110 transition-all duration-300 ease-in-out"
        aria-label="Tenho interesse"
      >
        <HeartIcon className="h-10 w-10 text-teal-400" />
      </button>
    </div>
  );
};

export default SwipeButtons;