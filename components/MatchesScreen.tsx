import React from 'react';
import { UserProfile } from '../types';

interface MatchesScreenProps {
  matches: UserProfile[];
  onSelectMatch: (match: UserProfile) => void;
}

const MatchesScreen: React.FC<MatchesScreenProps> = ({ matches, onSelectMatch }) => {
  return (
    <div className="w-full max-w-5xl mx-auto text-white">
      <h2 className="text-3xl font-bold text-center mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-teal-400">Suas Combinações</h2>
      {matches.length === 0 ? (
        <div className="text-center text-gray-400 mt-10">
            <p>Você ainda não possui combinações.</p>
            <p className="text-sm mt-2">Quando você e outro servidor demonstrarem interesse um no outro, a combinação aparecerá aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
          {matches.map((match) => (
            <button 
              key={match.matricula} 
              className="text-center group"
              onClick={() => onSelectMatch(match)}
            >
              <div className="relative p-1 rounded-full bg-gray-700 group-hover:bg-gradient-to-r from-indigo-500 to-teal-400 transition-all duration-300 ease-in-out">
                 <img
                    src={match.imageUrl}
                    alt={match.name}
                    className="w-full aspect-square rounded-full object-cover border-2 border-[#161B29] group-hover:scale-105 transition-transform duration-300"
                  />
              </div>
              <p className="mt-2 font-semibold truncate transition-colors group-hover:text-teal-400">{match.name}</p>
              <p className="text-sm text-gray-400 truncate">{match.currentPosition}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MatchesScreen;