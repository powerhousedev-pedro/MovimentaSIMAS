
import React from 'react';
import { UserProfile, SwipeDirection } from '../types';

interface HistoryScreenProps {
  history: { profile: UserProfile; direction: SwipeDirection }[];
  onUndo: () => void;
  isUndoLoading: boolean;
}

const HistoryScreen: React.FC<HistoryScreenProps> = ({ history, onUndo, isUndoLoading }) => {
  const liked = history.filter(item => item.direction === 'right');
  const skipped = history.filter(item => item.direction === 'left');

  const HistoryList = ({ title, items }: { title: string, items: { profile: UserProfile }[] }) => (
    <div>
      <h3 className="text-xl font-semibold text-teal-400 mb-4">{title} ({items.length})</h3>
      {items.length === 0 ? (
        <p className="text-gray-400">Nenhum perfil aqui.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...items].reverse().map(({ profile }) => (
            <div key={profile.matricula} className="relative aspect-square">
              <img src={profile.imageUrl} alt={profile.name} className="w-full h-full object-cover rounded-xl" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 rounded-b-xl">
                <p className="text-white text-sm font-semibold truncate">{profile.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto text-white">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-teal-400">Histórico de Interações</h2>
        <p className="text-gray-400 mt-2">Veja os perfis com os quais você interagiu.</p>
      </div>
      
      <div className="mb-8 text-center p-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl">
        <button
          onClick={onUndo}
          disabled={history.length === 0 || isUndoLoading}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full py-3 px-6 shadow-lg hover:bg-white/20 transform hover:scale-105 transition-all duration-300 ease-in-out disabled:bg-gray-500/20 disabled:text-gray-400 disabled:cursor-not-allowed disabled:scale-100"
        >
          {isUndoLoading ? 'Desfazendo...' : 'Desfazer Última Ação'}
        </button>
        {history.length === 0 && <p className="text-xs text-gray-400 mt-2">Você ainda não interagiu com nenhum perfil.</p>}
      </div>
      
      <div className="space-y-8">
        <HistoryList title="Interesses" items={liked} />
        <HistoryList title="Pulados" items={skipped} />
      </div>
    </div>
  );
};

export default HistoryScreen;